"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitApplication = exports.getActiveQualifications = exports.getActiveCities = exports.getActiveJobs = exports.submitApplicationSchema = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const uuid_1 = require("uuid");
const zod_1 = require("zod");
const fs_1 = __importDefault(require("fs"));
// Create upload directory if it doesn't exist
const uploadDir = 'public/uploads/cvs';
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
exports.submitApplicationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1),
        phone: zod_1.z.string().min(1),
        address: zod_1.z.string().min(1),
        birthdate: zod_1.z.string().optional(),
        marital_status: zod_1.z.enum(["single", "married", "separated"]),
        university: zod_1.z.string().optional(),
        college: zod_1.z.string().optional(),
        graduate_date: zod_1.z.string().optional(),
        qualification_id: zod_1.z.string().uuid(),
        current_job: zod_1.z.string().optional(),
        expected_salary: zod_1.z.string().transform(v => parseInt(v)).optional(),
        experiences: zod_1.z.string().optional(),
        courses: zod_1.z.string().optional(),
        city_id: zod_1.z.string().uuid(),
        job_id: zod_1.z.string().uuid(),
        link: zod_1.z.string().optional(),
    }),
});
const getActiveJobs = async (req, res) => {
    const activeJobs = await db_1.db.select().from(schema_1.jobs).where((0, drizzle_orm_1.eq)(schema_1.jobs.status, true)).orderBy((0, drizzle_orm_1.desc)(schema_1.jobs.createdAt));
    (0, response_1.SuccessResponse)(res, { jobs: activeJobs }, 200);
};
exports.getActiveJobs = getActiveJobs;
const getActiveCities = async (req, res) => {
    const activeCities = await db_1.db.select().from(schema_1.cities).where((0, drizzle_orm_1.eq)(schema_1.cities.status, true)).orderBy((0, drizzle_orm_1.desc)(schema_1.cities.createdAt));
    (0, response_1.SuccessResponse)(res, { cities: activeCities }, 200);
};
exports.getActiveCities = getActiveCities;
const getActiveQualifications = async (req, res) => {
    const activeQualifications = await db_1.db.select().from(schema_1.qualifications).where((0, drizzle_orm_1.eq)(schema_1.qualifications.status, true)).orderBy((0, drizzle_orm_1.desc)(schema_1.qualifications.createdAt));
    (0, response_1.SuccessResponse)(res, { qualifications: activeQualifications }, 200);
};
exports.getActiveQualifications = getActiveQualifications;
const submitApplication = async (req, res) => {
    if (!req.file) {
        throw new Error("CV file is required");
    }
    // Convert date strings to actual Date objects for DB if provided
    let birthdateStr = req.body.birthdate || null;
    let graduateDateStr = req.body.graduate_date || null;
    // Zod validation
    const validated = await exports.submitApplicationSchema.parseAsync({ body: req.body });
    const data = validated.body;
    const id = (0, uuid_1.v4)();
    const cvPath = `/uploads/cvs/${req.file.filename}`; // This assumes you serve 'public' folder as static
    await db_1.db.insert(schema_1.applications).values({
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
    (0, response_1.SuccessResponse)(res, { message: "Application submitted successfully" }, 201);
};
exports.submitApplication = submitApplication;
