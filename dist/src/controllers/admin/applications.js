"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteApplication = exports.updateApplicationFavourite = exports.getApplicationById = exports.getAllApplications = exports.updateApplicationFavouriteSchema = exports.ApplicationIdSchema = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const zod_1 = require("zod");
// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
exports.ApplicationIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }).uuid("Invalid ID format"),
    }),
});
exports.updateApplicationFavouriteSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }).uuid("Invalid ID format"),
    }),
    body: zod_1.z.object({
        favourite: zod_1.z.boolean({ required_error: "favourite is required" }),
    }),
});
// ==========================================
// 🎮 Controllers
// ==========================================
const getAllApplications = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const favourite = req.query.favourite;
    const offset = (page - 1) * limit;
    let whereConditions = [];
    if (search) {
        whereConditions.push((0, drizzle_orm_1.like)(schema_1.applications.name, `%${search}%`));
    }
    if (favourite === 'true' || favourite === '1') {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.applications.favourite, true));
    }
    let query = db_1.db
        .select({
        id: schema_1.applications.id,
        name: schema_1.applications.name,
        phone: schema_1.applications.phone,
        expected_salary: schema_1.applications.expected_salary,
        favourite: schema_1.applications.favourite,
        upload_cv: schema_1.applications.upload_cv,
        createdAt: schema_1.applications.createdAt,
        job_name: schema_1.jobs.name,
        city_name: schema_1.cities.name,
        qualification_name: schema_1.qualifications.name
    })
        .from(schema_1.applications)
        .leftJoin(schema_1.jobs, (0, drizzle_orm_1.eq)(schema_1.applications.job_id, schema_1.jobs.id))
        .leftJoin(schema_1.cities, (0, drizzle_orm_1.eq)(schema_1.applications.city_id, schema_1.cities.id))
        .leftJoin(schema_1.qualifications, (0, drizzle_orm_1.eq)(schema_1.applications.qualification_id, schema_1.qualifications.id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.applications.createdAt))
        .$dynamic();
    let countQuery = db_1.db.select({ total: (0, drizzle_orm_1.count)() }).from(schema_1.applications).$dynamic();
    if (whereConditions.length > 0) {
        query = query.where((0, drizzle_orm_1.and)(...whereConditions));
        countQuery = countQuery.where((0, drizzle_orm_1.and)(...whereConditions));
    }
    const [allApplications, [{ total: totalCount }]] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery
    ]);
    (0, response_1.SuccessResponse)(res, {
        applications: allApplications,
        pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit)
        }
    }, 200);
};
exports.getAllApplications = getAllApplications;
const getApplicationById = async (req, res) => {
    const validated = await exports.ApplicationIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const result = await db_1.db
        .select({
        id: schema_1.applications.id,
        name: schema_1.applications.name,
        address: schema_1.applications.address,
        birthdate: schema_1.applications.birthdate,
        graduate_date: schema_1.applications.graduate_date,
        expected_salary: schema_1.applications.expected_salary,
        marital_status: schema_1.applications.marital_status,
        phone: schema_1.applications.phone,
        experiences: schema_1.applications.experiences,
        current_job: schema_1.applications.current_job,
        courses: schema_1.applications.courses,
        university: schema_1.applications.university,
        college: schema_1.applications.college,
        upload_cv: schema_1.applications.upload_cv,
        link: schema_1.applications.link,
        favourite: schema_1.applications.favourite,
        createdAt: schema_1.applications.createdAt,
        job_id: schema_1.applications.job_id,
        job_name: schema_1.jobs.name,
        city_id: schema_1.applications.city_id,
        city_name: schema_1.cities.name,
        qualification_id: schema_1.applications.qualification_id,
        qualification_name: schema_1.qualifications.name
    })
        .from(schema_1.applications)
        .leftJoin(schema_1.jobs, (0, drizzle_orm_1.eq)(schema_1.applications.job_id, schema_1.jobs.id))
        .leftJoin(schema_1.cities, (0, drizzle_orm_1.eq)(schema_1.applications.city_id, schema_1.cities.id))
        .leftJoin(schema_1.qualifications, (0, drizzle_orm_1.eq)(schema_1.applications.qualification_id, schema_1.qualifications.id))
        .where((0, drizzle_orm_1.eq)(schema_1.applications.id, id))
        .limit(1);
    if (!result[0])
        throw new NotFound_1.NotFound("Application not found");
    (0, response_1.SuccessResponse)(res, { application: result[0] }, 200);
};
exports.getApplicationById = getApplicationById;
const updateApplicationFavourite = async (req, res) => {
    const validated = await exports.updateApplicationFavouriteSchema.parseAsync({ params: req.params, body: req.body });
    const { id } = validated.params;
    const { favourite } = validated.body;
    const existing = await db_1.db.select().from(schema_1.applications).where((0, drizzle_orm_1.eq)(schema_1.applications.id, id)).limit(1);
    if (!existing[0])
        throw new NotFound_1.NotFound("Application not found");
    await db_1.db.update(schema_1.applications).set({ favourite }).where((0, drizzle_orm_1.eq)(schema_1.applications.id, id));
    (0, response_1.SuccessResponse)(res, { message: "Application favourite status updated" }, 200);
};
exports.updateApplicationFavourite = updateApplicationFavourite;
const deleteApplication = async (req, res) => {
    const validated = await exports.ApplicationIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const existing = await db_1.db.select().from(schema_1.applications).where((0, drizzle_orm_1.eq)(schema_1.applications.id, id)).limit(1);
    if (!existing[0])
        throw new NotFound_1.NotFound("Application not found");
    await db_1.db.delete(schema_1.applications).where((0, drizzle_orm_1.eq)(schema_1.applications.id, id));
    (0, response_1.SuccessResponse)(res, { message: "Application deleted successfully" }, 200);
};
exports.deleteApplication = deleteApplication;
