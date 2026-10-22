// src/controllers/admin/sales/target.ts

import { Request, Response } from "express";
import { db } from "../../../models/db";
import { targets, target_items, target_sales, users, salesProjectUsers } from "../../../models/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { SuccessResponse } from "../../../utils/response";
import { NotFound } from "../../../Errors/NotFound";
import { z } from "zod";
import crypto from "crypto";
import { getProjectId, isLeader } from "./helpers";

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================

export const createTargetSchema = z.object({
  body: z.object({
    type: z.enum(["visit", "sales", "points"], {
      required_error: "Type is required",
      invalid_type_error: "Type must be either 'visit', 'sales', or 'points'",
    }).default("visit"),
    
    name: z.string({
      required_error: "Name is required",
    })
    .min(1, "Name cannot be empty")
    .max(255, "Name cannot exceed 255 characters"),

    items: z.array(
      z.object({
        year: z.number({ required_error: "Year is required" }).int(),
        month: z.number({ required_error: "Month is required" }).int().min(1).max(12),
        number: z.number({ required_error: "Monthly target number is required" }).positive(),
      }),
      { required_error: "Items are required" }
    ).min(1, "At least one target item is required"),

    sales: z.array(
      z.string({ invalid_type_error: "Sales User ID must be a string" }).uuid("Invalid User ID format"),
      { required_error: "Sales users array is required" }
    ).min(1, "At least one sales user must be assigned"),
  }),
});

export const updateTargetSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required in parameters" }),
  }),
  body: z.object({
    type: z.enum(["visit", "sales", "points"]).optional(),
    name: z.string().min(1, "Name cannot be empty").max(255).optional(),
    items: z.array(
      z.object({
        year: z.number({ required_error: "Year is required" }).int(),
        month: z.number({ required_error: "Month is required" }).int().min(1).max(12),
        number: z.number({ required_error: "Monthly target number is required" }).positive(),
      })
    ).min(1, "At least one target item is required").optional(),
    sales: z.array(
      z.string({ invalid_type_error: "Sales User ID must be a string" }).uuid("Invalid User ID format")
    ).min(1, "At least one sales user must be assigned").optional(),
  }),
});

export const targetIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required in parameters" }),
  }),
});

export const getAllTargetsSchema = z.object({
  params: z.object({
    type: z.enum(["visit", "sales", "points"]).optional(),
  }),
});

// ==========================================
// 🎮 Controllers
// ==========================================

// ✅ Get All Targets
export const getAllTargets = async (req: Request, res: Response) => {
  const validated = await getAllTargetsSchema.parseAsync({ params: req.params });
  const { type } = validated.params;
  const projectId = getProjectId(req);

  const whereConditions = [];
  if (projectId) {
    whereConditions.push(eq(targets.sales_project_id, projectId));
  }
  if (type) {
    whereConditions.push(eq(targets.type, type));
  }

  let query = db
    .select({
      id: targets.id,
      type: targets.type,
      name: targets.name,
      createdAt: targets.createdAt,
    })
    .from(targets);

  if (whereConditions.length > 0) {
    query = query.where(and(...whereConditions)) as typeof query;
  }

  const alltargets = await query;
  SuccessResponse(res, { targets: alltargets }, 200);
}; 

// ✅ Get Sales Users list for assignment
export const lists = async (req: Request, res: Response) => {
  const projectId = getProjectId(req);
  const role = req.user?.role;
  const userId = req.user?.id;
  let sales: { id: string; name: string; phone: string }[] = [];

  if (isLeader(role) && userId) {
    sales = await db
      .select({
        id: users.id,
        phone: users.phone,
        name: users.name,
      })
      .from(users)
      .where(
        or(
          and(eq(users.role, "sales"), eq(users.leader_id, userId)),
          eq(users.id, userId)
        )
      );
  } else if (projectId) {
    const assigned = await db
      .select({
        id: users.id,
        phone: users.phone,
        name: users.name,
      })
      .from(salesProjectUsers)
      .innerJoin(users, eq(salesProjectUsers.user_id, users.id))
      .where(
        and(
          eq(salesProjectUsers.sales_project_id, projectId),
          eq(users.role, "sales")
        )
      );
    sales = assigned;
  }

  if (sales.length === 0) {
    sales = await db
      .select({
        id: users.id,
        phone: users.phone, 
        name: users.name,  
      })
      .from(users) 
      .where(eq(users.role, "sales"));
  }
  
  SuccessResponse(res, { sales }, 200);
};

// ✅ Get Target By ID
export const getTargetsById = async (req: Request, res: Response) => {
  const validated = await targetIdSchema.parseAsync({ params: req.params });
  const { id } = validated.params; 
  const projectId = getProjectId(req);

  const whereConditions = [eq(targets.id, id)];
  if (projectId) {
    whereConditions.push(eq(targets.sales_project_id, projectId));
  }

  const targetResult = await db
    .select({
      id: targets.id,
      type: targets.type, 
      name: targets.name,
      createdAt: targets.createdAt,
      updatedAt: targets.updatedAt,
    })
    .from(targets) 
    .where(and(...whereConditions))
    .limit(1);

  const target = targetResult[0];

  if (!target) {
    throw new NotFound("Target not found");
  }

  const [items, salesList] = await Promise.all([
    db
      .select({
        id: target_items.id,
        year: target_items.year,
        month: target_items.month,
        number: target_items.number,
      })
      .from(target_items)
      .where(eq(target_items.target_id, id)),

    db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
      })
      .from(target_sales)
      .innerJoin(users, eq(target_sales.user_id, users.id))
      .where(eq(target_sales.target_id, id))
  ]);

  SuccessResponse(
    res, 
    { 
      target: {
        ...target,
        items,
        sales: salesList,
      } 
    }, 
    200
  );
};

// ✅ Create Targets
export const createTargets = async (req: Request, res: Response) => {
  const validated = await createTargetSchema.parseAsync({ body: req.body });
  const { type, name, items, sales } = validated.body;
  const projectId = getProjectId(req);

  const targetId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(targets).values({
      id: targetId,
      sales_project_id: projectId,
      type,
      name,
    });

    const itemsToInsert = items.map(item => ({
      id: crypto.randomUUID(),
      sales_project_id: projectId,
      target_id: targetId,
      year: item.year,
      month: item.month,
      number: item.number
    }));
    await tx.insert(target_items).values(itemsToInsert);

    const salesToInsert = sales.map(userId => ({
      id: crypto.randomUUID(),
      sales_project_id: projectId,
      target_id: targetId,
      user_id: userId
    }));
    await tx.insert(target_sales).values(salesToInsert);
  });

  SuccessResponse(res, { id: targetId, message: "Target along with items and sales assigned successfully" }, 201);
};

// ✅ Update Targets
export const updateTargets = async (req: Request, res: Response) => {
  const validated = await updateTargetSchema.parseAsync({ 
    params: req.params, 
    body: req.body 
  });
  const { id } = validated.params;
  const { items, sales, ...targetFields } = validated.body;
  const projectId = getProjectId(req);

  const whereConditions = [eq(targets.id, id)];
  if (projectId) {
    whereConditions.push(eq(targets.sales_project_id, projectId));
  }

  const existingTargets = await db
    .select({ id: targets.id })
    .from(targets)
    .where(and(...whereConditions))
    .limit(1);

  if (!existingTargets[0]) {
    throw new NotFound("Target not found");
  }

  const updateData = Object.fromEntries(
    Object.entries(targetFields).filter(([_, value]) => value !== undefined)
  );

  await db.transaction(async (tx) => {
    if (Object.keys(updateData).length > 0) {
      await tx.update(targets).set(updateData).where(eq(targets.id, id));
    }

    if (items) {
      await tx.delete(target_items).where(eq(target_items.target_id, id));
      const itemsToInsert = items.map(item => ({
        id: crypto.randomUUID(),
        sales_project_id: projectId,
        target_id: id,
        year: item.year,
        month: item.month,
        number: item.number
      }));
      await tx.insert(target_items).values(itemsToInsert);
    }

    if (sales) {
      await tx.delete(target_sales).where(eq(target_sales.target_id, id));
      const salesToInsert = sales.map(userId => ({
        id: crypto.randomUUID(),
        sales_project_id: projectId,
        target_id: id,
        user_id: userId
      }));
      await tx.insert(target_sales).values(salesToInsert);
    }
  });

  SuccessResponse(res, { message: "Target updated successfully" }, 200);
};

// ✅ Delete Targets
export const deleteTargets = async (req: Request, res: Response) => {
  const validated = await targetIdSchema.parseAsync({ params: req.params });
  const { id } = validated.params;
  const projectId = getProjectId(req);

  const whereConditions = [eq(targets.id, id)];
  if (projectId) {
    whereConditions.push(eq(targets.sales_project_id, projectId));
  }

  const existingTargets = await db
    .select({ id: targets.id })
    .from(targets)
    .where(and(...whereConditions))
    .limit(1);

  if (!existingTargets[0]) {
    throw new NotFound("Target not found");
  }

  await db.delete(targets).where(eq(targets.id, id));
  SuccessResponse(res, { message: "Target deleted successfully" }, 200);
};
