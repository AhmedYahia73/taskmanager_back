// src/controllers/admin/sales/products.ts

import { Request, Response } from "express";
import { db } from "../../../models/db";
import { products } from "../../../models/schema";
import { SuccessResponse } from "../../../utils/response";
import { NotFound } from "../../../Errors/NotFound";
import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================

const pointSchema = z.object({
  point: z.number({ required_error: "Point value is required" }).min(0),
  duration: z.string({ required_error: "Duration is required" })
});

export const createProductSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }).min(1).max(255),
    feez: z.number().optional().default(0),
    description: z.string().max(1000).optional().nullable(),
    demo_link: z.string().max(200).optional().nullable(),
    points: z.array(pointSchema, { required_error: "Points array is required" }).min(1)
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }),
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    feez: z.number().optional(),
    description: z.string().max(1000).optional().nullable(),
    demo_link: z.string().max(200).optional().nullable(),
    points: z.array(pointSchema).optional()
  }),
});

export const ProductIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }),
  }),
});

const getProjectId = (req: Request): string => {
  return (req.salesProjectId || req.headers["x-sales-project-id"] || req.user?.project_id) as string;
};

// ==========================================
// 🎮 Controllers
// ==========================================

// ✅ Get All Products
export const getAllProducts = async (req: Request, res: Response) => {
  const projectId = getProjectId(req);
  let query = db.select().from(products).$dynamic();
  if (projectId) {
    query = query.where(eq(products.sales_project_id, projectId));
  }
  const allProducts = await query.orderBy(desc(products.createdAt));
  SuccessResponse(res, { allProducts }, 200);
};

// ✅ Get Product By ID
export const getProductById = async (req: Request, res: Response) => {
  const validated = await ProductIdSchema.parseAsync({ params: req.params });
  const { id } = validated.params;
  const projectId = getProjectId(req);

  const whereConditions = [eq(products.id, id)];
  if (projectId) {
    whereConditions.push(eq(products.sales_project_id, projectId));
  }

  const productRaw = await db
    .select()
    .from(products)
    .where(and(...whereConditions))
    .limit(1);

  if (!productRaw[0]) {
    throw new NotFound("Product not found");
  }

  SuccessResponse(res, { product: productRaw[0] }, 200);
};

// ✅ Create Product
export const createProduct = async (req: Request, res: Response) => {
  const validated = await createProductSchema.parseAsync({ body: req.body });
  const { name, feez, description, demo_link, points } = validated.body;
  const projectId = getProjectId(req);

  const newId = crypto.randomUUID();
  await db.insert(products).values({
    id: newId,
    name,
    feez,
    description: description || null,
    demo_link: demo_link || null,
    points,
    sales_project_id: projectId,
  });

  SuccessResponse(res, { id: newId, message: "Product created successfully" }, 201);
};

// ✅ Update Product
export const updateProduct = async (req: Request, res: Response) => {
  const validated = await updateProductSchema.parseAsync({
    params: req.params,
    body: req.body,
  });
  const { id } = validated.params;
  const { name, feez, description, demo_link, points } = validated.body;
  const projectId = getProjectId(req);

  const whereConditions = [eq(products.id, id)];
  if (projectId) {
    whereConditions.push(eq(products.sales_project_id, projectId));
  }

  const existingProduct = await db
    .select()
    .from(products)
    .where(and(...whereConditions))
    .limit(1);

  if (!existingProduct[0]) {
    throw new NotFound("Product not found");
  }

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (feez !== undefined) updateData.feez = feez;
  if (description !== undefined) updateData.description = description;
  if (demo_link !== undefined) updateData.demo_link = demo_link;
  if (points !== undefined) updateData.points = points;

  if (Object.keys(updateData).length > 0) {
    await db.update(products).set(updateData).where(and(...whereConditions));
  }

  SuccessResponse(res, { message: "Product updated successfully" }, 200);
};

// ✅ Delete Product
export const deleteProduct = async (req: Request, res: Response) => {
  const validated = await ProductIdSchema.parseAsync({ params: req.params });
  const { id } = validated.params;
  const projectId = getProjectId(req);

  const whereConditions = [eq(products.id, id)];
  if (projectId) {
    whereConditions.push(eq(products.sales_project_id, projectId));
  }

  const existingProduct = await db
    .select()
    .from(products)
    .where(and(...whereConditions))
    .limit(1);

  if (!existingProduct[0]) {
    throw new NotFound("Product not found");
  }

  await db.delete(products).where(and(...whereConditions));

  SuccessResponse(res, { message: "Product deleted successfully" }, 200);
};
