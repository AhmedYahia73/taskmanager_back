// src/controllers/admin/salesAdmin.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { users } from "../../models/schema";
import { salesDb } from "../../models/sales/db";
import { salesProjects, salesProjectUsers } from "../../models/sales/schema";
import { SQL, and, or, eq, like, count, desc, ne, sql, inArray } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { BadRequest } from "../../Errors/BadRequest";
import bcrypt from "bcrypt";
import { saveBase64Image } from "../../utils/handleImages";
import { deletePhotoFromServer } from "../../utils/deleteImage";
import { getFileUrl } from "../../middlewares/upload";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================

export const createSalesAdminSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }).min(1).max(200),
    email: z.string({ required_error: "Email is required" }).email().max(100),
    phone: z.string({ required_error: "Phone is required" }).min(5).max(20),
    password: z.string({ required_error: "Password is required" }).min(6),
    image: z.any().nullable().optional(),
    status: z.enum(["active", "inactive"]).default("active"),
    sales_project_id: z.string().uuid().nullable().optional(),
    sales_project_ids: z.any().optional(),
  }),
});

export const updateSalesAdminSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }).uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    email: z.string().email().max(100).optional(),
    phone: z.string().min(5).max(20).optional(),
    password: z.string().min(6).optional(),
    image: z.any().nullable().optional(),
    status: z.enum(["active", "inactive"]).optional(),
    sales_project_id: z.string().uuid().nullable().optional(),
    sales_project_ids: z.any().optional(),
  }),
});

export const salesAdminIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }).uuid(),
  }),
});

// Helper: Handle image upload or base64
async function handleImage(
  req: Request,
  rawImage: any,
  existingImage?: string | null
): Promise<string | null | undefined> {
  if (req.file) {
    if (existingImage) await deletePhotoFromServer(existingImage);
    return getFileUrl(req, req.file, "SalesUsers");
  }
  if (rawImage && typeof rawImage === "string" && rawImage.startsWith("data:")) {
    if (existingImage) await deletePhotoFromServer(existingImage);
    const result = await saveBase64Image(req, rawImage, "SalesUsers");
    return result.url;
  }
  if (rawImage === "" || rawImage === null || rawImage === "null") {
    if (existingImage) await deletePhotoFromServer(existingImage);
    return null;
  }
  if (typeof rawImage === "string" && rawImage && rawImage !== "undefined") {
    return rawImage.trim();
  }
  return undefined;
}

// Helper: Parse multiple sales project IDs from payload
export function parseSalesProjectIds(body: any): string[] {
  let ids: string[] = [];
  if (Array.isArray(body.sales_project_ids)) {
    ids = body.sales_project_ids;
  } else if (typeof body.sales_project_ids === "string" && body.sales_project_ids.trim()) {
    try {
      const parsed = JSON.parse(body.sales_project_ids);
      if (Array.isArray(parsed)) ids = parsed;
      else if (parsed) ids = [parsed];
    } catch {
      ids = body.sales_project_ids.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
  } else if (body.sales_project_id) {
    ids = [body.sales_project_id];
  }
  return [...new Set(ids.filter((id) => typeof id === "string" && id.trim()))];
}

export function extractProjectIds(
  rawProjectIds: any,
  singleProjectId?: string | null,
  relationProjectIds?: (string | null | undefined)[]
): string[] {
  let ids: (string | null | undefined)[] = [];
  if (Array.isArray(rawProjectIds)) {
    ids = rawProjectIds;
  } else if (typeof rawProjectIds === "string" && rawProjectIds.trim()) {
    try {
      const parsed = JSON.parse(rawProjectIds);
      if (Array.isArray(parsed)) ids = parsed;
      else if (parsed) ids = [parsed];
    } catch {
      ids = rawProjectIds.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
  }

  if (Array.isArray(relationProjectIds)) {
    ids = [...ids, ...relationProjectIds];
  }

  if (singleProjectId && typeof singleProjectId === "string" && singleProjectId.trim()) {
    ids.push(singleProjectId.trim());
  }

  return [...new Set(ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0))];
}

// Helper: Sync sales_project_users table in salesDb
export async function syncSalesProjectUsers(userId: string, projectIds: string[]) {
  try {
    await salesDb.delete(salesProjectUsers).where(eq(salesProjectUsers.user_id, userId));
    if (projectIds.length > 0) {
      await salesDb.insert(salesProjectUsers).values(
        projectIds.map((projId) => ({
          id: uuidv4(),
          user_id: userId,
          sales_project_id: projId,
        }))
      );
    }
  } catch (err) {
    console.error("Error syncing sales_project_users:", err);
  }
}

// ==========================================
// 🎯 Dropdown Lists
// ==========================================
export const lists = async (req: Request, res: Response) => {
  const projectsList = await salesDb
    .select({ id: salesProjects.id, name: salesProjects.name, logo: salesProjects.logo, design: salesProjects.design })
    .from(salesProjects)
    .catch(() => []);

  SuccessResponse(res, { sales_projects: projectsList }, 200);
};

// ==========================================
// 👑 Controllers
// ==========================================

export const getAllSalesAdmins = async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
  const search = (req.query.search as string)?.trim() || "";
  const salesProjectId = (req.query.sales_project_id as string)?.trim() || "";
  const offset = (page - 1) * limit;

  const whereConditions: SQL[] = [eq(users.role, "admin")];

  if (salesProjectId) {
    whereConditions.push(
      or(
        eq(users.sales_project_id, salesProjectId),
        sql`JSON_CONTAINS(${users.sales_project_ids}, JSON_QUOTE(${salesProjectId}))`
      ) as SQL
    );
  }

  if (search) {
    const pattern = `%${search}%`;
    whereConditions.push(
      or(
        like(users.name, pattern),
        like(users.email, pattern),
        like(users.phone, pattern)
      ) as SQL
    );
  }

  const [projectsList, allAdmins, [{ total: totalCount }]] = await Promise.all([
    salesDb.select({ id: salesProjects.id, name: salesProjects.name, logo: salesProjects.logo, design: salesProjects.design }).from(salesProjects).catch(() => []),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        image: users.image,
        status: users.status,
        role: users.role,
        sales_project_id: users.sales_project_id,
        sales_project_ids: users.sales_project_ids,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(...whereConditions))
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(users).where(and(...whereConditions)),
  ]);

  const projectsMap = new Map(projectsList.map((p) => [p.id, p]));

  const userIds = allAdmins.map((u) => u.id);
  const spRows = userIds.length > 0
    ? await salesDb
        .select({ user_id: salesProjectUsers.user_id, sales_project_id: salesProjectUsers.sales_project_id })
        .from(salesProjectUsers)
        .where(inArray(salesProjectUsers.user_id, userIds))
        .catch(() => [])
    : [];

  const userProjectsMap = new Map<string, string[]>();
  for (const row of spRows) {
    if (!userProjectsMap.has(row.user_id)) {
      userProjectsMap.set(row.user_id, []);
    }
    if (row.sales_project_id) {
      userProjectsMap.get(row.user_id)!.push(row.sales_project_id);
    }
  }

  const enrichedAdmins = allAdmins.map((admin) => {
    const projectIds = extractProjectIds(
      admin.sales_project_ids,
      admin.sales_project_id,
      userProjectsMap.get(admin.id)
    );

    const assignedProjects = projectIds.map((pid) => projectsMap.get(pid)).filter(Boolean);
    const primaryProj = assignedProjects[0] || null;

    return {
      ...admin,
      sales_project_ids: projectIds,
      sales_projects: assignedProjects,
      sales_project_name: primaryProj?.name || null,
      sales_project_logo: primaryProj?.logo || null,
      sales_project_design: primaryProj?.design || null,
    };
  });

  SuccessResponse(res, {
    admins: enrichedAdmins,
    pagination: {
      total: Number(totalCount),
      page,
      limit,
      totalPages: Math.ceil(Number(totalCount) / limit),
    },
  }, 200);
};

export const getSalesAdminById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const [projectsList, adminResult] = await Promise.all([
    salesDb.select({ id: salesProjects.id, name: salesProjects.name, logo: salesProjects.logo, design: salesProjects.design }).from(salesProjects).catch(() => []),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        image: users.image,
        status: users.status,
        role: users.role,
        sales_project_id: users.sales_project_id,
        sales_project_ids: users.sales_project_ids,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.id, id), eq(users.role, "admin")))
      .limit(1),
  ]);

  if (!adminResult[0]) throw new NotFound("Sales Admin not found");

  const admin = adminResult[0];
  const projectsMap = new Map(projectsList.map((p) => [p.id, p]));

  const spRows = await salesDb
    .select({ sales_project_id: salesProjectUsers.sales_project_id })
    .from(salesProjectUsers)
    .where(eq(salesProjectUsers.user_id, id))
    .catch(() => []);

  const projectIds = extractProjectIds(
    admin.sales_project_ids,
    admin.sales_project_id,
    spRows.map((r) => r.sales_project_id)
  );

  const assignedProjects = projectIds.map((pid) => projectsMap.get(pid)).filter(Boolean);
  const primaryProj = assignedProjects[0] || null;

  SuccessResponse(res, {
    admin: {
      ...admin,
      sales_project_ids: projectIds,
      sales_projects: assignedProjects,
      sales_project_name: primaryProj?.name || null,
      sales_project_logo: primaryProj?.logo || null,
    },
  }, 200);
};

export const createSalesAdmin = async (req: Request, res: Response) => {
  const validated = await createSalesAdminSchema.parseAsync({ body: req.body });
  const { name, email, phone, password, status } = validated.body;
  const projectIds = parseSalesProjectIds(req.body);

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.email, email), eq(users.phone, phone)))
    .limit(1);

  if (existing[0]) throw new BadRequest("Email or Phone already exists");

  const savedImage = await handleImage(req, validated.body.image);
  const hashedPassword = await bcrypt.hash(password, 10);
  const id = uuidv4();

  await db.insert(users).values({
    id,
    name,
    email,
    phone,
    password: hashedPassword,
    image: savedImage || null,
    status,
    role: "admin",
    sales_project_id: projectIds[0] || null,
    sales_project_ids: projectIds,
  });

  await syncSalesProjectUsers(id, projectIds);

  const created = await db.select().from(users).where(eq(users.id, id)).limit(1);
  SuccessResponse(res, { message: "Sales Admin created successfully", admin: created[0] }, 201);
};

export const updateSalesAdmin = async (req: Request, res: Response) => {
  const validated = await updateSalesAdminSchema.parseAsync({ params: req.params, body: req.body });
  const { id } = validated.params;
  const { name, email, phone, password, status } = validated.body;

  const existing = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, "admin"))).limit(1);
  if (!existing[0]) throw new NotFound("Sales Admin not found");

  if (email && email !== existing[0].email) {
    const dupEmail = await db.select({ id: users.id }).from(users).where(and(eq(users.email, email), ne(users.id, id))).limit(1);
    if (dupEmail[0]) throw new BadRequest("Email already exists");
  }
  if (phone && phone !== existing[0].phone) {
    const dupPhone = await db.select({ id: users.id }).from(users).where(and(eq(users.phone, phone), ne(users.id, id))).limit(1);
    if (dupPhone[0]) throw new BadRequest("Phone already exists");
  }

  const savedImage = await handleImage(req, validated.body.image, existing[0].image);

  const updateData: Record<string, any> = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (status !== undefined) updateData.status = status;
  if (savedImage !== undefined) updateData.image = savedImage;
  if (password) updateData.password = await bcrypt.hash(password, 10);

  if (req.body.sales_project_ids !== undefined || req.body.sales_project_id !== undefined) {
    const projectIds = parseSalesProjectIds(req.body);
    updateData.sales_project_ids = projectIds;
    updateData.sales_project_id = projectIds[0] || null;
    await syncSalesProjectUsers(id, projectIds);
  }

  if (Object.keys(updateData).length > 0) {
    await db.update(users).set(updateData).where(eq(users.id, id));
  }

  const updated = await db.select().from(users).where(eq(users.id, id)).limit(1);
  SuccessResponse(res, { message: "Sales Admin updated successfully", admin: updated[0] }, 200);
};

export const deleteSalesAdmin = async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, "admin"))).limit(1);
  if (!existing[0]) throw new NotFound("Sales Admin not found");

  if (existing[0].image) await deletePhotoFromServer(existing[0].image);
  await db.delete(users).where(eq(users.id, id));
  await salesDb.delete(salesProjectUsers).where(eq(salesProjectUsers.user_id, id)).catch(() => {});

  SuccessResponse(res, { message: "Sales Admin deleted successfully" }, 200);
};
