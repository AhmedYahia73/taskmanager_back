// src/controllers/admin/sales/status.ts

import { Request, Response } from "express";
import { db } from "../../../models/db";
import { visitStatus } from "../../../models/schema";
import { eq, and } from "drizzle-orm";
import { SuccessResponse } from "../../../utils/response";
import { NotFound } from "../../../Errors/NotFound";
import { z } from "zod";

export const createVisitStatusSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: "Name is required",
    }).min(1, "Name cannot be empty"),
    status: z.boolean({
      required_error: "Status is required",
      invalid_type_error: "Status must be a boolean (true or false)",
    }),
  }),
});

export const updateVisitStatusSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required in parameters" }),
  }),
  body: z.object({
    name: z.string().min(1, "Name cannot be empty").optional(),
    status: z.boolean({ invalid_type_error: "Status must be a boolean" }).optional(),
  }),
});

export const VisitStatusIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required in parameters" }),
  }),
});

const getProjectId = (req: Request): string => {
  return (req.salesProjectId || req.headers["x-sales-project-id"] || req.user?.project_id) as string;
};

// ==========================================
// 🎮 Controllers
// ==========================================

// ✅ Get All VisitStatuss
export const getAllVisitStatuss = async (req: Request, res: Response) => {
  const projectId = getProjectId(req);
  let query = db
    .select({
      id: visitStatus.id,
      name: visitStatus.name,
      status: visitStatus.status,
    })
    .from(visitStatus)
    .$dynamic();

  if (projectId) {
    query = query.where(eq(visitStatus.sales_project_id, projectId));
  }

  const allVisitStatuss = await query;
  SuccessResponse(res, { allVisitStatuss }, 200);
};

// ✅ Get VisitStatuss By ID
export const getVisitStatussById = async (req: Request, res: Response) => {
  const validated = await VisitStatusIdSchema.parseAsync({ params: req.params });
  const { id } = validated.params;
  const projectId = getProjectId(req);

  const whereConditions = [eq(visitStatus.id, id)];
  if (projectId) {
    whereConditions.push(eq(visitStatus.sales_project_id, projectId));
  }

  const VisitStatuss = await db
    .select({
      id: visitStatus.id,
      name: visitStatus.name,
      status: visitStatus.status,
    })
    .from(visitStatus)
    .where(and(...whereConditions))
    .limit(1);

  if (!VisitStatuss[0]) {
    throw new NotFound("VisitStatuss not found");
  }

  SuccessResponse(res, { VisitStatuss: VisitStatuss[0] }, 200);
};

// ✅ Create VisitStatuss
export const createVisitStatuss = async (req: Request, res: Response) => {
  const validated = await createVisitStatusSchema.parseAsync({ body: req.body });
  const { status, name } = validated.body;
  const projectId = getProjectId(req);

  await db.insert(visitStatus).values({
    status,
    name,
    sales_project_id: projectId,
  });

  SuccessResponse(res, { message: "VisitStatuss created successfully" }, 201);
};

// ✅ Update VisitStatuss
export const updateVisitStatuss = async (req: Request, res: Response) => {
  const validated = await updateVisitStatusSchema.parseAsync({
    params: req.params,
    body: req.body,
  });
  const { id } = validated.params;
  const { status, name } = validated.body;
  const projectId = getProjectId(req);

  const whereConditions = [eq(visitStatus.id, id)];
  if (projectId) {
    whereConditions.push(eq(visitStatus.sales_project_id, projectId));
  }

  const existingVisitStatuss = await db
    .select()
    .from(visitStatus)
    .where(and(...whereConditions))
    .limit(1);

  if (!existingVisitStatuss[0]) {
    throw new NotFound("VisitStatuss not found");
  }

  const updateData: Partial<{ status: boolean; name: string }> = {};
  if (status !== undefined) updateData.status = status;
  if (name !== undefined) updateData.name = name;

  await db.update(visitStatus).set(updateData).where(and(...whereConditions));

  SuccessResponse(res, { message: "VisitStatuss updated successfully" }, 200);
};

// ✅ Delete VisitStatuss
export const deleteVisitStatuss = async (req: Request, res: Response) => {
  const validated = await VisitStatusIdSchema.parseAsync({ params: req.params });
  const { id } = validated.params;
  const projectId = getProjectId(req);

  const whereConditions = [eq(visitStatus.id, id)];
  if (projectId) {
    whereConditions.push(eq(visitStatus.sales_project_id, projectId));
  }

  const existingVisitStatuss = await db
    .select()
    .from(visitStatus)
    .where(and(...whereConditions))
    .limit(1);

  if (!existingVisitStatuss[0]) {
    throw new NotFound("VisitStatuss not found");
  }

  await db.delete(visitStatus).where(and(...whereConditions));

  SuccessResponse(res, { message: "VisitStatuss deleted successfully" }, 200);
};
