import { Request, Response } from "express";
import { db } from "../../models/db";
import { applications, jobs, cities, qualifications } from "../../models/schema"; 
import { SQL, and, eq, like, count, desc } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { z } from "zod";

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
export const ApplicationIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }).uuid("Invalid ID format"),
  }),
});

export const updateApplicationFavouriteSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }).uuid("Invalid ID format"),
  }),
  body: z.object({
    favourite: z.boolean({ required_error: "favourite is required" }),
  }),
});

// ==========================================
// 🎮 Controllers
// ==========================================
export const getAllApplications = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const favourite = req.query.favourite as string;
    const offset = (page - 1) * limit;

    let whereConditions: SQL[] = [];

    if (search) {
        whereConditions.push(
            like(applications.name, `%${search}%`)
        );
    }
    
    if (favourite === 'true' || favourite === '1') {
        whereConditions.push(eq(applications.favourite, true));
    }

    let query = db
        .select({
            id: applications.id,
            name: applications.name,
            phone: applications.phone,
            expected_salary: applications.expected_salary,
            favourite: applications.favourite,
            upload_cv: applications.upload_cv,
            createdAt: applications.createdAt,
            job_name: jobs.name,
            city_name: cities.name,
            qualification_name: qualifications.name
        })
        .from(applications)
        .leftJoin(jobs, eq(applications.job_id, jobs.id))
        .leftJoin(cities, eq(applications.city_id, cities.id))
        .leftJoin(qualifications, eq(applications.qualification_id, qualifications.id))
        .orderBy(desc(applications.createdAt))
        .$dynamic();

    let countQuery = db.select({ total: count() }).from(applications).$dynamic();

    if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions));
        countQuery = countQuery.where(and(...whereConditions));
    }

    const [allApplications, [{ total: totalCount }]] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery
    ]);

    SuccessResponse(res, { 
        applications: allApplications,
        pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit)
        }
    }, 200);
};

export const getApplicationById = async (req: Request, res: Response) => {
    const validated = await ApplicationIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 

    const result = await db
        .select({
            id: applications.id,
            name: applications.name,
            address: applications.address,
            birthdate: applications.birthdate,
            graduate_date: applications.graduate_date,
            expected_salary: applications.expected_salary,
            marital_status: applications.marital_status,
            phone: applications.phone,
            experiences: applications.experiences,
            current_job: applications.current_job,
            courses: applications.courses,
            university: applications.university,
            college: applications.college,
            upload_cv: applications.upload_cv,
            link: applications.link,
            favourite: applications.favourite,
            createdAt: applications.createdAt,
            job_id: applications.job_id,
            job_name: jobs.name,
            city_id: applications.city_id,
            city_name: cities.name,
            qualification_id: applications.qualification_id,
            qualification_name: qualifications.name
        })
        .from(applications)
        .leftJoin(jobs, eq(applications.job_id, jobs.id))
        .leftJoin(cities, eq(applications.city_id, cities.id))
        .leftJoin(qualifications, eq(applications.qualification_id, qualifications.id))
        .where(eq(applications.id, id))
        .limit(1);

    if (!result[0]) throw new NotFound("Application not found");

    SuccessResponse(res, { application: result[0] }, 200);
};

export const updateApplicationFavourite = async (req: Request, res: Response) => {
    const validated = await updateApplicationFavouriteSchema.parseAsync({ params: req.params, body: req.body });
    const { id } = validated.params;
    const { favourite } = validated.body;

    const existing = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
    if (!existing[0]) throw new NotFound("Application not found");

    await db.update(applications).set({ favourite }).where(eq(applications.id, id));

    SuccessResponse(res, { message: "Application favourite status updated" }, 200);
};

export const deleteApplication = async (req: Request, res: Response) => {
    const validated = await ApplicationIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 
 
    const existing = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
    if (!existing[0]) throw new NotFound("Application not found");

    await db.delete(applications).where(eq(applications.id, id));
    SuccessResponse(res, { message: "Application deleted successfully" }, 200);
};
