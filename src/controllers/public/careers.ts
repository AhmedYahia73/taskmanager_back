import { Request, Response } from "express";
import { db } from "../../models/db";
import { applications, jobs, cities, qualifications } from "../../models/schema"; 
import { eq, desc } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import fs from "fs";

// Create upload directory if it doesn't exist
const uploadDir = 'public/uploads/cvs';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

export const submitApplicationSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    address: z.string().min(1),
    birthdate: z.string().optional(),
    marital_status: z.enum(["single", "married", "separated"]),
    university: z.string().optional(),
    college: z.string().optional(),
    graduate_date: z.string().optional(),
    qualification_id: z.string().uuid(),
    current_job: z.string().optional(),
    expected_salary: z.string().transform(v => parseInt(v)).optional(),
    experiences: z.string().optional(),
    courses: z.string().optional(),
    city_id: z.string().uuid(),
    job_id: z.string().uuid(),
    link: z.string().optional(),
  }),
});

export const getActiveJobs = async (req: Request, res: Response) => {
    const activeJobs = await db.select().from(jobs).where(eq(jobs.status, true)).orderBy(desc(jobs.createdAt));
    SuccessResponse(res, { jobs: activeJobs }, 200);
};

export const getActiveCities = async (req: Request, res: Response) => {
    const activeCities = await db.select().from(cities).where(eq(cities.status, true)).orderBy(desc(cities.createdAt));
    SuccessResponse(res, { cities: activeCities }, 200);
};

export const getActiveQualifications = async (req: Request, res: Response) => {
    const activeQualifications = await db.select().from(qualifications).where(eq(qualifications.status, true)).orderBy(desc(qualifications.createdAt));
    SuccessResponse(res, { qualifications: activeQualifications }, 200);
};

export const submitApplication = async (req: Request, res: Response) => {
    if (!req.file) {
        throw new Error("CV file is required");
    }

    // Convert date strings to actual Date objects for DB if provided
    let birthdateStr = req.body.birthdate || null;
    let graduateDateStr = req.body.graduate_date || null;
    
    // Zod validation
    const validated = await submitApplicationSchema.parseAsync({ body: req.body });
    const data = validated.body;

    const id = uuidv4();
    const cvPath = `/uploads/cvs/${req.file.filename}`; // This assumes you serve 'public' folder as static

    await db.insert(applications).values({
        id,
        name: data.name,
        phone: data.phone,
        address: data.address,
        birthdate: birthdateStr,
        marital_status: data.marital_status,
        university: data.university,
        college: data.college,
        graduate_date: graduateDateStr ? new Date(graduateDateStr) : null,
        qualification_id: data.qualification_id,
        current_job: data.current_job,
        expected_salary: data.expected_salary,
        experiences: data.experiences,
        courses: data.courses,
        city_id: data.city_id,
        job_id: data.job_id,
        link: data.link,
        upload_cv: cvPath,
        favourite: false
    });

    SuccessResponse(res, { message: "Application submitted successfully" }, 201);
};
