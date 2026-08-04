import { Request, Response } from "express";
import { db } from "../../models/db";
import { qualifications } from "../../models/schema"; 
import { SQL, and, eq, like, count, desc } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
export const createQualificationSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }).min(1).max(200),
    status: z.boolean().optional(),
  }),
});

export const updateQualificationSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }).uuid("Invalid ID format"),
  }),
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    status: z.boolean().optional(),
  }),
});

export const QualificationIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }).uuid("Invalid ID format"),
  }),
});

// ==========================================
// 🎮 Controllers
// ==========================================
export const getAllQualifications = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const offset = (page - 1) * limit;

    let query = db.select().from(qualifications).orderBy(desc(qualifications.createdAt)).$dynamic();
    let countQuery = db.select({ total: count() }).from(qualifications).$dynamic();

    if (search) {
        query = query.where(like(qualifications.name, `%${search}%`));
        countQuery = countQuery.where(like(qualifications.name, `%${search}%`));
    }

    const [allQualifications, [{ total: totalCount }]] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery
    ]);

    SuccessResponse(res, { 
        qualifications: allQualifications,
        pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit)
        }
    }, 200);
};

export const getQualificationById = async (req: Request, res: Response) => {
    const validated = await QualificationIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 

    const result = await db.select().from(qualifications).where(eq(qualifications.id, id)).limit(1);
    if (!result[0]) throw new NotFound("Qualification not found");

    SuccessResponse(res, { qualification: result[0] }, 200);
};

export const createQualification = async (req: Request, res: Response) => {
    const validated = await createQualificationSchema.parseAsync({ body: req.body });
    const { name, status } = validated.body;

    const id = uuidv4();
    await db.insert(qualifications).values({ id, name, status: status ?? true });

    SuccessResponse(res, { message: "Qualification created successfully" }, 201);
};

export const updateQualification = async (req: Request, res: Response) => {
    const validated = await updateQualificationSchema.parseAsync({ params: req.params, body: req.body });
    const { id } = validated.params;
    const { name, status } = validated.body;

    const existing = await db.select().from(qualifications).where(eq(qualifications.id, id)).limit(1);
    if (!existing[0]) throw new NotFound("Qualification not found");

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
  
    if (Object.keys(updateData).length > 0) {
        await db.update(qualifications).set(updateData).where(eq(qualifications.id, id));
    }

    SuccessResponse(res, { message: "Qualification updated successfully" }, 200);
};

export const deleteQualification = async (req: Request, res: Response) => {
    const validated = await QualificationIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 
 
    const existing = await db.select().from(qualifications).where(eq(qualifications.id, id)).limit(1);
    if (!existing[0]) throw new NotFound("Qualification not found");

    await db.delete(qualifications).where(eq(qualifications.id, id));
    SuccessResponse(res, { message: "Qualification deleted successfully" }, 200);
};
