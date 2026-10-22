"use strict";
// src/controllers/admin/sales/status.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVisitStatuss = exports.updateVisitStatuss = exports.createVisitStatuss = exports.getVisitStatussById = exports.getAllVisitStatuss = exports.VisitStatusIdSchema = exports.updateVisitStatusSchema = exports.createVisitStatusSchema = void 0;
const db_1 = require("../../../models/db");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../../utils/response");
const NotFound_1 = require("../../../Errors/NotFound");
const zod_1 = require("zod");
exports.createVisitStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({
            required_error: "Name is required",
        }).min(1, "Name cannot be empty"),
        status: zod_1.z.boolean({
            required_error: "Status is required",
            invalid_type_error: "Status must be a boolean (true or false)",
        }),
    }),
});
exports.updateVisitStatusSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required in parameters" }),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, "Name cannot be empty").optional(),
        status: zod_1.z.boolean({ invalid_type_error: "Status must be a boolean" }).optional(),
    }),
});
exports.VisitStatusIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required in parameters" }),
    }),
});
const getProjectId = (req) => {
    return (req.salesProjectId || req.headers["x-sales-project-id"] || req.user?.project_id);
};
// ==========================================
// 🎮 Controllers
// ==========================================
// ✅ Get All VisitStatuss
const getAllVisitStatuss = async (req, res) => {
    const projectId = getProjectId(req);
    let query = db_1.db
        .select({
        id: schema_1.visitStatus.id,
        name: schema_1.visitStatus.name,
        status: schema_1.visitStatus.status,
    })
        .from(schema_1.visitStatus)
        .$dynamic();
    if (projectId) {
        query = query.where((0, drizzle_orm_1.eq)(schema_1.visitStatus.sales_project_id, projectId));
    }
    const allVisitStatuss = await query;
    (0, response_1.SuccessResponse)(res, { allVisitStatuss }, 200);
};
exports.getAllVisitStatuss = getAllVisitStatuss;
// ✅ Get VisitStatuss By ID
const getVisitStatussById = async (req, res) => {
    const validated = await exports.VisitStatusIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const projectId = getProjectId(req);
    const whereConditions = [(0, drizzle_orm_1.eq)(schema_1.visitStatus.id, id)];
    if (projectId) {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.visitStatus.sales_project_id, projectId));
    }
    const VisitStatuss = await db_1.db
        .select({
        id: schema_1.visitStatus.id,
        name: schema_1.visitStatus.name,
        status: schema_1.visitStatus.status,
    })
        .from(schema_1.visitStatus)
        .where((0, drizzle_orm_1.and)(...whereConditions))
        .limit(1);
    if (!VisitStatuss[0]) {
        throw new NotFound_1.NotFound("VisitStatuss not found");
    }
    (0, response_1.SuccessResponse)(res, { VisitStatuss: VisitStatuss[0] }, 200);
};
exports.getVisitStatussById = getVisitStatussById;
// ✅ Create VisitStatuss
const createVisitStatuss = async (req, res) => {
    const validated = await exports.createVisitStatusSchema.parseAsync({ body: req.body });
    const { status, name } = validated.body;
    const projectId = getProjectId(req);
    const newStatusId = crypto.randomUUID();
    await db_1.db.insert(schema_1.visitStatus).values({
        id: newStatusId,
        status,
        name,
        sales_project_id: projectId,
    });
    (0, response_1.SuccessResponse)(res, { id: newStatusId, message: "VisitStatuss created successfully" }, 201);
};
exports.createVisitStatuss = createVisitStatuss;
// ✅ Update VisitStatuss
const updateVisitStatuss = async (req, res) => {
    const validated = await exports.updateVisitStatusSchema.parseAsync({
        params: req.params,
        body: req.body,
    });
    const { id } = validated.params;
    const { status, name } = validated.body;
    const projectId = getProjectId(req);
    const whereConditions = [(0, drizzle_orm_1.eq)(schema_1.visitStatus.id, id)];
    if (projectId) {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.visitStatus.sales_project_id, projectId));
    }
    const existingVisitStatuss = await db_1.db
        .select()
        .from(schema_1.visitStatus)
        .where((0, drizzle_orm_1.and)(...whereConditions))
        .limit(1);
    if (!existingVisitStatuss[0]) {
        throw new NotFound_1.NotFound("VisitStatuss not found");
    }
    const updateData = {};
    if (status !== undefined)
        updateData.status = status;
    if (name !== undefined)
        updateData.name = name;
    await db_1.db.update(schema_1.visitStatus).set(updateData).where((0, drizzle_orm_1.and)(...whereConditions));
    (0, response_1.SuccessResponse)(res, { message: "VisitStatuss updated successfully" }, 200);
};
exports.updateVisitStatuss = updateVisitStatuss;
// ✅ Delete VisitStatuss
const deleteVisitStatuss = async (req, res) => {
    const validated = await exports.VisitStatusIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const projectId = getProjectId(req);
    const whereConditions = [(0, drizzle_orm_1.eq)(schema_1.visitStatus.id, id)];
    if (projectId) {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.visitStatus.sales_project_id, projectId));
    }
    const existingVisitStatuss = await db_1.db
        .select()
        .from(schema_1.visitStatus)
        .where((0, drizzle_orm_1.and)(...whereConditions))
        .limit(1);
    if (!existingVisitStatuss[0]) {
        throw new NotFound_1.NotFound("VisitStatuss not found");
    }
    await db_1.db.delete(schema_1.visitStatus).where((0, drizzle_orm_1.and)(...whereConditions));
    (0, response_1.SuccessResponse)(res, { message: "VisitStatuss deleted successfully" }, 200);
};
exports.deleteVisitStatuss = deleteVisitStatuss;
