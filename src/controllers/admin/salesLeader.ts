// src/controllers/admin/salesLeader.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { users } from "../../models/schema";
import { salesDb } from "../../models/sales/db";
import { salesProjects, targets, salesProjectUsers } from "../../models/sales/schema";
import { SQL, and, or, eq, like, count, desc, ne, sql } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { BadRequest } from "../../Errors/BadRequest";
import bcrypt from "bcrypt";
import { saveBase64Image } from "../../utils/handleImages";
import { deletePhotoFromServer } from "../../utils/deleteImage";
import { getFileUrl } from "../../middlewares/upload";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { parseSalesProjectIds, syncSalesProjectUsers } from "./salesAdmin";

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================

export const createSalesLeaderSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }).min(1).max(200),
    email: z.string({ required_error: "Email is required" }).email().max(100),
    phone: z.string({ required_error: "Phone is required" }).min(5).max(20),
    password: z.string({ required_error: "Password is required" }).min(6),
    image: z.any().nullable().optional(),
    status: z.enum(["active", "inactive"]).default("active"),
    sales_project_id: z.string().uuid().nullable().optional(),
    sales_project_ids: z.any().optional(),
    target_id: z.string().uuid().nullable().optional(),
  }),
});

export const updateSalesLeaderSchema = z.object({
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
    target_id: z.string().uuid().nullable().optional(),
  }),
});

export const salesLeaderIdSchema = z.object({
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

// ==========================================
// 🎯 Dropdown Lists (Targets & Sales Projects)
// ==========================================
export const lists = async (req: Request, res: Response) => {
  const [projectsList, targetsList] = await Promise.all([
    salesDb.select({ id: salesProjects.id, name: salesProjects.name, logo: salesProjects.logo, design: salesProjects.design }).from(salesProjects).catch(() => []),
    salesDb.select({ id: targets.id, name: targets.name }).from(targets).catch(() => []),
  ]);

  SuccessResponse(res, { sales_projects: projectsList, targets: targetsList }, 200);
};

// ==========================================
// 🛡️ Controllers
// ==========================================

export const getAllSalesLeaders = async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
  const search = (req.query.search as string)?.trim() || "";
  const salesProjectId = (req.query.sales_project_id as string)?.trim() || "";
  const offset = (page - 1) * limit;

  const whereConditions: SQL[] = [eq(users.role, "leader_sales")];

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

  const [projectsList, targetsList, allLeaders, [{ total: totalCount }]] = await Promise.all([
    salesDb.select({ id: salesProjects.id, name: salesProjects.name, logo: salesProjects.logo, design: salesProjects.design }).from(salesProjects).catch(() => []),
    salesDb.select({ id: targets.id, name: targets.name }).from(targets).catch(() => []),
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
        target_id: users.target_id,
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
  const targetsMap = new Map(targetsList.map((t) => [t.id, t.name]));

  const enrichedLeaders = allLeaders.map((leader) => {
    const projectIds: string[] = Array.isArray(leader.sales_project_ids)
      ? (leader.sales_project_ids as string[])
      : leader.sales_project_id
      ? [leader.sales_project_id]
      : [];

    const assignedProjects = projectIds.map((pid) => projectsMap.get(pid)).filter(Boolean);
    const primaryProj = projectIds[0] ? projectsMap.get(projectIds[0]) : null;

    return {
      ...leader,
      sales_project_ids: projectIds,
      sales_projects: assignedProjects,
      sales_project_name: primaryProj?.name || null,
      sales_project_logo: primaryProj?.logo || null,
      target_name: leader.target_id ? targetsMap.get(leader.target_id) || null : null,
    };
  });

  SuccessResponse(res, {
    leaders: enrichedLeaders,
    pagination: {
      total: Number(totalCount),
      page,
      limit,
      totalPages: Math.ceil(Number(totalCount) / limit),
    },
  }, 200);
};

export const getSalesLeaderById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const [projectsList, targetsList, leaderResult] = await Promise.all([
    salesDb.select({ id: salesProjects.id, name: salesProjects.name, logo: salesProjects.logo, design: salesProjects.design }).from(salesProjects).catch(() => []),
    salesDb.select({ id: targets.id, name: targets.name }).from(targets).catch(() => []),
    db.select().from(users).where(and(eq(users.id, id), eq(users.role, "leader_sales"))).limit(1),
  ]);

  if (!leaderResult[0]) throw new NotFound("Sales Leader not found");

  const leader = leaderResult[0];
  const projectsMap = new Map(projectsList.map((p) => [p.id, p]));
  const targetsMap = new Map(targetsList.map((t) => [t.id, t.name]));

  const projectIds: string[] = Array.isArray(leader.sales_project_ids)
    ? (leader.sales_project_ids as string[])
    : leader.sales_project_id
    ? [leader.sales_project_id]
    : [];

  const assignedProjects = projectIds.map((pid) => projectsMap.get(pid)).filter(Boolean);
  const primaryProj = projectIds[0] ? projectsMap.get(projectIds[0]) : null;

  SuccessResponse(res, {
    leader: {
      ...leader,
      sales_project_ids: projectIds,
      sales_projects: assignedProjects,
      sales_project_name: primaryProj?.name || null,
      sales_project_logo: primaryProj?.logo || null,
      target_name: leader.target_id ? targetsMap.get(leader.target_id) || null : null,
    },
  }, 200);
};

export const createSalesLeader = async (req: Request, res: Response) => {
  const validated = await createSalesLeaderSchema.parseAsync({ body: req.body });
  const { name, email, phone, password, status, target_id } = validated.body;
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
    role: "leader_sales",
    sales_project_id: projectIds[0] || null,
    sales_project_ids: projectIds,
    target_id: target_id || null,
  });

  await syncSalesProjectUsers(id, projectIds);

  const created = await db.select().from(users).where(eq(users.id, id)).limit(1);
  SuccessResponse(res, { message: "Sales Leader created successfully", leader: created[0] }, 201);
};

export const updateSalesLeader = async (req: Request, res: Response) => {
  const validated = await updateSalesLeaderSchema.parseAsync({ params: req.params, body: req.body });
  const { id } = validated.params;
  const { name, email, phone, password, status, target_id } = validated.body;

  const existing = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, "leader_sales"))).limit(1);
  if (!existing[0]) throw new NotFound("Sales Leader not found");

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
  if (target_id !== undefined) updateData.target_id = target_id || null;
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
  SuccessResponse(res, { message: "Sales Leader updated successfully", leader: updated[0] }, 200);
};

export const deleteSalesLeader = async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, "leader_sales"))).limit(1);
  if (!existing[0]) throw new NotFound("Sales Leader not found");

  if (existing[0].image) await deletePhotoFromServer(existing[0].image);
  await db.delete(users).where(eq(users.id, id));
  await salesDb.delete(salesProjectUsers).where(eq(salesProjectUsers.user_id, id)).catch(() => {});

  SuccessResponse(res, { message: "Sales Leader deleted successfully" }, 200);
};
