"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteQualification = exports.updateQualification = exports.createQualification = exports.getQualificationById = exports.getAllQualifications = exports.QualificationIdSchema = exports.updateQualificationSchema = exports.createQualificationSchema = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
exports.createQualificationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({ required_error: "Name is required" }).min(1).max(200),
        status: zod_1.z.boolean().optional(),
    }),
});
exports.updateQualificationSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }).uuid("Invalid ID format"),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(200).optional(),
        status: zod_1.z.boolean().optional(),
    }),
});
exports.QualificationIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }).uuid("Invalid ID format"),
    }),
});
// ==========================================
// 🎮 Controllers
// ==========================================
const getAllQualifications = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;
    let query = db_1.db.select().from(schema_1.qualifications).orderBy((0, drizzle_orm_1.desc)(schema_1.qualifications.createdAt)).$dynamic();
    let countQuery = db_1.db.select({ total: (0, drizzle_orm_1.count)() }).from(schema_1.qualifications).$dynamic();
    if (search) {
        query = query.where((0, drizzle_orm_1.like)(schema_1.qualifications.name, `%${search}%`));
        countQuery = countQuery.where((0, drizzle_orm_1.like)(schema_1.qualifications.name, `%${search}%`));
    }
    const [allQualifications, [{ total: totalCount }]] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery
    ]);
    (0, response_1.SuccessResponse)(res, {
        qualifications: allQualifications,
        pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit)
        }
    }, 200);
};
exports.getAllQualifications = getAllQualifications;
const getQualificationById = async (req, res) => {
    const validated = await exports.QualificationIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const result = await db_1.db.select().from(schema_1.qualifications).where((0, drizzle_orm_1.eq)(schema_1.qualifications.id, id)).limit(1);
    if (!result[0])
        throw new NotFound_1.NotFound("Qualification not found");
    (0, response_1.SuccessResponse)(res, { qualification: result[0] }, 200);
};
exports.getQualificationById = getQualificationById;
const createQualification = async (req, res) => {
    const validated = await exports.createQualificationSchema.parseAsync({ body: req.body });
    const { name, status } = validated.body;
    const id = (0, uuid_1.v4)();
    await db_1.db.insert(schema_1.qualifications).values({ id, name, status: status ?? true });
    (0, response_1.SuccessResponse)(res, { message: "Qualification created successfully" }, 201);
};
exports.createQualification = createQualification;
const updateQualification = async (req, res) => {
    const validated = await exports.updateQualificationSchema.parseAsync({ params: req.params, body: req.body });
    const { id } = validated.params;
    const { name, status } = validated.body;
    const existing = await db_1.db.select().from(schema_1.qualifications).where((0, drizzle_orm_1.eq)(schema_1.qualifications.id, id)).limit(1);
    if (!existing[0])
        throw new NotFound_1.NotFound("Qualification not found");
    const updateData = {};
    if (name !== undefined)
        updateData.name = name;
    if (status !== undefined)
        updateData.status = status;
    if (Object.keys(updateData).length > 0) {
        await db_1.db.update(schema_1.qualifications).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.qualifications.id, id));
    }
    (0, response_1.SuccessResponse)(res, { message: "Qualification updated successfully" }, 200);
};
exports.updateQualification = updateQualification;
const deleteQualification = async (req, res) => {
    const validated = await exports.QualificationIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const existing = await db_1.db.select().from(schema_1.qualifications).where((0, drizzle_orm_1.eq)(schema_1.qualifications.id, id)).limit(1);
    if (!existing[0])
        throw new NotFound_1.NotFound("Qualification not found");
    await db_1.db.delete(schema_1.qualifications).where((0, drizzle_orm_1.eq)(schema_1.qualifications.id, id));
    (0, response_1.SuccessResponse)(res, { message: "Qualification deleted successfully" }, 200);
};
exports.deleteQualification = deleteQualification;
