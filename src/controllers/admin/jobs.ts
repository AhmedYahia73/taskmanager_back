import { Request, Response } from "express";
import { db } from "../../models/db";
import { jobs } from "../../models/schema"; 
import { SQL, and, eq, like, count, desc } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
export const createJobSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }).min(1).max(200),
    status: z.boolean().optional(),
  }),
});

export const updateJobSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }).uuid("Invalid ID format"),
  }),
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    status: z.boolean().optional(),
  }),
});

export const JobIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }).uuid("Invalid ID format"),
  }),
});

// ==========================================
// 🎮 Controllers
// ==========================================
export const getAllJobs = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const offset = (page - 1) * limit;

    let query = db.select().from(jobs).orderBy(desc(jobs.createdAt)).$dynamic();
    let countQuery = db.select({ total: count() }).from(jobs).$dynamic();

    if (search) {
        query = query.where(like(jobs.name, `%${search}%`));
        countQuery = countQuery.where(like(jobs.name, `%${search}%`));
    }

    const [allJobs, [{ total: totalCount }]] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery
    ]);

    SuccessResponse(res, { 
        jobs: allJobs,
        pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit)
        }
    }, 200);
};

export const getJobById = async (req: Request, res: Response) => {
    const validated = await JobIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 

    const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    if (!result[0]) throw new NotFound("Job not found");

    SuccessResponse(res, { job: result[0] }, 200);
};

export const createJob = async (req: Request, res: Response) => {
    const validated = await createJobSchema.parseAsync({ body: req.body });
    const { name, status } = validated.body;

    const id = uuidv4();
    await db.insert(jobs).values({ id, name, status: status ?? true });

    SuccessResponse(res, { message: "Job created successfully" }, 201);
};

export const updateJob = async (req: Request, res: Response) => {
    const validated = await updateJobSchema.parseAsync({ params: req.params, body: req.body });
    const { id } = validated.params;
    const { name, status } = validated.body;

    const existing = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    if (!existing[0]) throw new NotFound("Job not found");

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
  
    if (Object.keys(updateData).length > 0) {
        await db.update(jobs).set(updateData).where(eq(jobs.id, id));
    }

    SuccessResponse(res, { message: "Job updated successfully" }, 200);
};

export const deleteJob = async (req: Request, res: Response) => {
    const validated = await JobIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 
 
    const existing = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    if (!existing[0]) throw new NotFound("Job not found");

    await db.delete(jobs).where(eq(jobs.id, id));
    SuccessResponse(res, { message: "Job deleted successfully" }, 200);
};
