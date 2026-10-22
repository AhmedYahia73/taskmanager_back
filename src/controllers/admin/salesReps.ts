// src/controllers/admin/salesReps.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { users } from "../../models/schema";
import { salesDb } from "../../models/sales/db";
import { salesProjects, targets, salesProjectUsers } from "../../models/sales/schema";
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
import { parseSalesProjectIds, syncSalesProjectUsers, extractProjectIds } from "./salesAdmin";

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================

export const createSalesRepSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }).min(1).max(200),
    email: z.string({ required_error: "Email is required" }).email().max(100),
    phone: z.string({ required_error: "Phone is required" }).min(5).max(20),
    password: z.string({ required_error: "Password is required" }).min(6),
    image: z.any().nullable().optional(),
    status: z.enum(["active", "inactive"]).default("active"),
    leader_id: z.string().uuid().nullable().optional(),
    sales_project_id: z.string().uuid().nullable().optional(),
    sales_project_ids: z.any().optional(),
    target_id: z.string().uuid().nullable().optional(),
  }),
});

export const updateSalesRepSchema = z.object({
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
    leader_id: z.string().uuid().nullable().optional(),
    sales_project_id: z.string().uuid().nullable().optional(),
    sales_project_ids: z.any().optional(),
    target_id: z.string().uuid().nullable().optional(),
  }),
});

export const salesRepIdSchema = z.object({
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
// 🎯 Dropdown Lists (Leaders, Targets & Sales Projects)
// ==========================================
export const lists = async (req: Request, res: Response) => {
  const salesProjectId =
    (req.query.sales_project_id as string)?.trim() ||
    (req.headers["x-sales-project-id"] as string)?.trim() ||
    (req.headers["sales_project_id"] as string)?.trim() ||
    (req as any).salesProjectId ||
    "";

  const leaderConditions: SQL[] = [eq(users.role, "leader_sales")];
  const targetConditions: SQL[] = [];

  if (salesProjectId) {
    targetConditions.push(eq(targets.sales_project_id, salesProjectId));

    const pivotLeaderIds = (
      await salesDb
        .select({ user_id: salesProjectUsers.user_id })
        .from(salesProjectUsers)
        .where(eq(salesProjectUsers.sales_project_id, salesProjectId))
        .catch(() => [])
    ).map((r) => r.user_id);

    const matchConditions: SQL[] = [
      eq(users.sales_project_id, salesProjectId),
      sql`(${users.sales_project_ids} IS NOT NULL AND JSON_VALID(${users.sales_project_ids}) AND JSON_CONTAINS(${users.sales_project_ids}, JSON_QUOTE(${salesProjectId})))`,
    ];
    if (pivotLeaderIds.length > 0) {
      matchConditions.push(inArray(users.id, pivotLeaderIds));
    }
    leaderConditions.push(or(...matchConditions)!);
  }

  const [projectsList, targetsList, leadersList] = await Promise.all([
    salesDb.select({ id: salesProjects.id, name: salesProjects.name, logo: salesProjects.logo, design: salesProjects.design }).from(salesProjects).catch(() => []),
    targetConditions.length > 0
      ? salesDb.select({ id: targets.id, name: targets.name }).from(targets).where(and(...targetConditions)).catch(() => [])
      : salesDb.select({ id: targets.id, name: targets.name }).from(targets).catch(() => []),
    db.select({ id: users.id, name: users.name, phone: users.phone }).from(users).where(and(...leaderConditions)).catch(() => []),
  ]);

  SuccessResponse(res, { sales_projects: projectsList, targets: targetsList, leaders: leadersList }, 200);
};

// ==========================================
// 💼 Controllers
// ==========================================

export const getAllSalesReps = async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
  const search = (req.query.search as string)?.trim() || "";
  const leaderId = (req.query.leader_id as string)?.trim() || "";
  const salesProjectId =
    (req.query.sales_project_id as string)?.trim() ||
    (req.headers["x-sales-project-id"] as string)?.trim() ||
    (req.headers["sales_project_id"] as string)?.trim() ||
    (req as any).salesProjectId ||
    "";
  const offset = (page - 1) * limit;

  const whereConditions: SQL[] = [eq(users.role, "sales")];

  const currentUser = req.user as any;
  if ((currentUser?.role === "leader_sales" || currentUser?.role === "leader") && currentUser?.id) {
    whereConditions.push(eq(users.leader_id, currentUser.id));
  } else if (leaderId) {
    whereConditions.push(eq(users.leader_id, leaderId));
  }
  if (salesProjectId) {
    const pivotUserIds = (
      await salesDb
        .select({ user_id: salesProjectUsers.user_id })
        .from(salesProjectUsers)
        .where(eq(salesProjectUsers.sales_project_id, salesProjectId))
        .catch(() => [])
    ).map((r) => r.user_id);

    const matchConditions: SQL[] = [
      eq(users.sales_project_id, salesProjectId),
      sql`(${users.sales_project_ids} IS NOT NULL AND JSON_VALID(${users.sales_project_ids}) AND JSON_CONTAINS(${users.sales_project_ids}, JSON_QUOTE(${salesProjectId})))`,
    ];

    if (pivotUserIds.length > 0) {
      matchConditions.push(inArray(users.id, pivotUserIds));
    }

    whereConditions.push(or(...matchConditions)!);
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

  const [projectsList, targetsList, leadersList, allSales, [{ total: totalCount }]] = await Promise.all([
    salesDb.select({ id: salesProjects.id, name: salesProjects.name, logo: salesProjects.logo, design: salesProjects.design }).from(salesProjects).catch(() => []),
    salesDb.select({ id: targets.id, name: targets.name }).from(targets).catch(() => []),
    db.select({ id: users.id, name: users.name, phone: users.phone }).from(users).where(eq(users.role, "leader_sales")).catch(() => []),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        image: users.image,
        status: users.status,
        role: users.role,
        leader_id: users.leader_id,
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
  const leadersMap = new Map(leadersList.map((l) => [l.id, l]));

  const userIds = allSales.map((u) => u.id);
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

  const enrichedSales = allSales.map((rep) => {
    const projectIds = extractProjectIds(
      rep.sales_project_ids,
      rep.sales_project_id,
      userProjectsMap.get(rep.id)
    );

    const assignedProjects = projectIds.map((pid) => projectsMap.get(pid)).filter(Boolean);
    const primaryProj = assignedProjects[0] || null;
    const leader = rep.leader_id ? leadersMap.get(rep.leader_id) : null;

    return {
      ...rep,
      leader_name: leader?.name || null,
      leader_phone: leader?.phone || null,
      sales_project_ids: projectIds,
      sales_projects: assignedProjects,
      sales_project_name: primaryProj?.name || null,
      sales_project_logo: primaryProj?.logo || null,
      target_name: rep.target_id ? targetsMap.get(rep.target_id) || null : null,
    };
  });

  SuccessResponse(res, {
    sales: enrichedSales,
    pagination: {
      total: Number(totalCount),
      page,
      limit,
      totalPages: Math.ceil(Number(totalCount) / limit),
    },
  }, 200);
};

export const getSalesRepById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const [projectsList, targetsList, leadersList, repResult] = await Promise.all([
    salesDb.select({ id: salesProjects.id, name: salesProjects.name, logo: salesProjects.logo, design: salesProjects.design }).from(salesProjects).catch(() => []),
    salesDb.select({ id: targets.id, name: targets.name }).from(targets).catch(() => []),
    db.select({ id: users.id, name: users.name, phone: users.phone }).from(users).where(eq(users.role, "leader_sales")).catch(() => []),
    db.select().from(users).where(and(eq(users.id, id), eq(users.role, "sales"))).limit(1),
  ]);

  if (!repResult[0]) throw new NotFound("Sales Representative not found");

  const rep = repResult[0];
  const projectsMap = new Map(projectsList.map((p) => [p.id, p]));
  const targetsMap = new Map(targetsList.map((t) => [t.id, t.name]));
  const leadersMap = new Map(leadersList.map((l) => [l.id, l]));

  const spRows = await salesDb
    .select({ sales_project_id: salesProjectUsers.sales_project_id })
    .from(salesProjectUsers)
    .where(eq(salesProjectUsers.user_id, id))
    .catch(() => []);

  const projectIds = extractProjectIds(
    rep.sales_project_ids,
    rep.sales_project_id,
    spRows.map((r) => r.sales_project_id)
  );

  const assignedProjects = projectIds.map((pid) => projectsMap.get(pid)).filter(Boolean);
  const primaryProj = assignedProjects[0] || null;
  const leader = rep.leader_id ? leadersMap.get(rep.leader_id) : null;

  SuccessResponse(res, {
    sales: {
      ...rep,
      leader_name: leader?.name || null,
      leader_phone: leader?.phone || null,
      sales_project_ids: projectIds,
      sales_projects: assignedProjects,
      sales_project_name: primaryProj?.name || null,
      sales_project_logo: primaryProj?.logo || null,
      target_name: rep.target_id ? targetsMap.get(rep.target_id) || null : null,
    },
  }, 200);
};

export const createSalesRep = async (req: Request, res: Response) => {
  const validated = await createSalesRepSchema.parseAsync({ body: req.body });
  const { name, email, phone, password, status, leader_id, target_id } = validated.body;
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

  const currentUser = req.user as any;
  let effectiveLeaderId = leader_id || null;
  if (!effectiveLeaderId && (currentUser?.role === "leader_sales" || currentUser?.role === "leader") && currentUser?.id) {
    effectiveLeaderId = currentUser.id;
  }

  await db.insert(users).values({
    id,
    name,
    email,
    phone,
    password: hashedPassword,
    image: savedImage || null,
    status,
    role: "sales",
    leader_id: effectiveLeaderId,
    sales_project_id: projectIds[0] || null,
    sales_project_ids: projectIds,
    target_id: target_id || null,
  });

  await syncSalesProjectUsers(id, projectIds);

  const created = await db.select().from(users).where(eq(users.id, id)).limit(1);
  SuccessResponse(res, { message: "Sales Representative created successfully", sales: created[0] }, 201);
};

export const updateSalesRep = async (req: Request, res: Response) => {
  const validated = await updateSalesRepSchema.parseAsync({ params: req.params, body: req.body });
  const { id } = validated.params;
  const { name, email, phone, password, status, leader_id, target_id } = validated.body;

  const existing = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, "sales"))).limit(1);
  if (!existing[0]) throw new NotFound("Sales Representative not found");

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
  if (leader_id !== undefined) updateData.leader_id = leader_id || null;
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
  SuccessResponse(res, { message: "Sales Representative updated successfully", sales: updated[0] }, 200);
};

export const deleteSalesRep = async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, "sales"))).limit(1);
  if (!existing[0]) throw new NotFound("Sales Representative not found");

  if (existing[0].image) await deletePhotoFromServer(existing[0].image);
  await db.delete(users).where(eq(users.id, id));
  await salesDb.delete(salesProjectUsers).where(eq(salesProjectUsers.user_id, id)).catch(() => {});

  SuccessResponse(res, { message: "Sales Representative deleted successfully" }, 200);
};
