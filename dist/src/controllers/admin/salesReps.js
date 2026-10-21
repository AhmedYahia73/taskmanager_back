"use strict";
// src/controllers/admin/salesReps.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSalesRep = exports.updateSalesRep = exports.createSalesRep = exports.getSalesRepById = exports.getAllSalesReps = exports.lists = exports.salesRepIdSchema = exports.updateSalesRepSchema = exports.createSalesRepSchema = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const db_2 = require("../../models/sales/db");
const schema_2 = require("../../models/sales/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const BadRequest_1 = require("../../Errors/BadRequest");
const bcrypt_1 = __importDefault(require("bcrypt"));
const handleImages_1 = require("../../utils/handleImages");
const deleteImage_1 = require("../../utils/deleteImage");
const upload_1 = require("../../middlewares/upload");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const salesAdmin_1 = require("./salesAdmin");
// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
exports.createSalesRepSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({ required_error: "Name is required" }).min(1).max(200),
        email: zod_1.z.string({ required_error: "Email is required" }).email().max(100),
        phone: zod_1.z.string({ required_error: "Phone is required" }).min(5).max(20),
        password: zod_1.z.string({ required_error: "Password is required" }).min(6),
        image: zod_1.z.any().nullable().optional(),
        status: zod_1.z.enum(["active", "inactive"]).default("active"),
        leader_id: zod_1.z.string().uuid().nullable().optional(),
        sales_project_id: zod_1.z.string().uuid().nullable().optional(),
        sales_project_ids: zod_1.z.any().optional(),
        target_id: zod_1.z.string().uuid().nullable().optional(),
    }),
});
exports.updateSalesRepSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }).uuid(),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(200).optional(),
        email: zod_1.z.string().email().max(100).optional(),
        phone: zod_1.z.string().min(5).max(20).optional(),
        password: zod_1.z.string().min(6).optional(),
        image: zod_1.z.any().nullable().optional(),
        status: zod_1.z.enum(["active", "inactive"]).optional(),
        leader_id: zod_1.z.string().uuid().nullable().optional(),
        sales_project_id: zod_1.z.string().uuid().nullable().optional(),
        sales_project_ids: zod_1.z.any().optional(),
        target_id: zod_1.z.string().uuid().nullable().optional(),
    }),
});
exports.salesRepIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }).uuid(),
    }),
});
// Helper: Handle image upload or base64
async function handleImage(req, rawImage, existingImage) {
    if (req.file) {
        if (existingImage)
            await (0, deleteImage_1.deletePhotoFromServer)(existingImage);
        return (0, upload_1.getFileUrl)(req, req.file, "SalesUsers");
    }
    if (rawImage && typeof rawImage === "string" && rawImage.startsWith("data:")) {
        if (existingImage)
            await (0, deleteImage_1.deletePhotoFromServer)(existingImage);
        const result = await (0, handleImages_1.saveBase64Image)(req, rawImage, "SalesUsers");
        return result.url;
    }
    if (rawImage === "" || rawImage === null || rawImage === "null") {
        if (existingImage)
            await (0, deleteImage_1.deletePhotoFromServer)(existingImage);
        return null;
    }
    if (typeof rawImage === "string" && rawImage && rawImage !== "undefined") {
        return rawImage.trim();
    }
    return undefined;
}
// ==========================================
// 🎯 Dropdown Lists (Leaders, Targets & Sales Projects)
// ==========================================
const lists = async (req, res) => {
    const [projectsList, targetsList, leadersList] = await Promise.all([
        db_2.salesDb.select({ id: schema_2.salesProjects.id, name: schema_2.salesProjects.name, logo: schema_2.salesProjects.logo, design: schema_2.salesProjects.design }).from(schema_2.salesProjects).catch(() => []),
        db_2.salesDb.select({ id: schema_2.targets.id, name: schema_2.targets.name }).from(schema_2.targets).catch(() => []),
        db_1.db.select({ id: schema_1.users.id, name: schema_1.users.name, phone: schema_1.users.phone }).from(schema_1.users).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.role, "leader_sales"), (0, drizzle_orm_1.eq)(schema_1.users.status, "active"))).catch(() => []),
    ]);
    (0, response_1.SuccessResponse)(res, { sales_projects: projectsList, targets: targetsList, leaders: leadersList }, 200);
};
exports.lists = lists;
// ==========================================
// 💼 Controllers
// ==========================================
const getAllSalesReps = async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const search = req.query.search?.trim() || "";
    const leaderId = req.query.leader_id?.trim() || "";
    const salesProjectId = req.query.sales_project_id?.trim() || "";
    const offset = (page - 1) * limit;
    const whereConditions = [(0, drizzle_orm_1.eq)(schema_1.users.role, "sales")];
    if (leaderId) {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.users.leader_id, leaderId));
    }
    if (salesProjectId) {
        whereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.users.sales_project_id, salesProjectId), (0, drizzle_orm_1.sql) `JSON_CONTAINS(${schema_1.users.sales_project_ids}, JSON_QUOTE(${salesProjectId}))`));
    }
    if (search) {
        const pattern = `%${search}%`;
        whereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.users.name, pattern), (0, drizzle_orm_1.like)(schema_1.users.email, pattern), (0, drizzle_orm_1.like)(schema_1.users.phone, pattern)));
    }
    const [projectsList, targetsList, leadersList, allSales, [{ total: totalCount }]] = await Promise.all([
        db_2.salesDb.select({ id: schema_2.salesProjects.id, name: schema_2.salesProjects.name, logo: schema_2.salesProjects.logo, design: schema_2.salesProjects.design }).from(schema_2.salesProjects).catch(() => []),
        db_2.salesDb.select({ id: schema_2.targets.id, name: schema_2.targets.name }).from(schema_2.targets).catch(() => []),
        db_1.db.select({ id: schema_1.users.id, name: schema_1.users.name, phone: schema_1.users.phone }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.role, "leader_sales")).catch(() => []),
        db_1.db
            .select({
            id: schema_1.users.id,
            name: schema_1.users.name,
            email: schema_1.users.email,
            phone: schema_1.users.phone,
            image: schema_1.users.image,
            status: schema_1.users.status,
            role: schema_1.users.role,
            leader_id: schema_1.users.leader_id,
            sales_project_id: schema_1.users.sales_project_id,
            sales_project_ids: schema_1.users.sales_project_ids,
            target_id: schema_1.users.target_id,
            createdAt: schema_1.users.createdAt,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)(...whereConditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt))
            .limit(limit)
            .offset(offset),
        db_1.db.select({ total: (0, drizzle_orm_1.count)() }).from(schema_1.users).where((0, drizzle_orm_1.and)(...whereConditions)),
    ]);
    const projectsMap = new Map(projectsList.map((p) => [p.id, p]));
    const targetsMap = new Map(targetsList.map((t) => [t.id, t.name]));
    const leadersMap = new Map(leadersList.map((l) => [l.id, l]));
    const enrichedSales = allSales.map((rep) => {
        const projectIds = Array.isArray(rep.sales_project_ids)
            ? rep.sales_project_ids
            : rep.sales_project_id
                ? [rep.sales_project_id]
                : [];
        const assignedProjects = projectIds.map((pid) => projectsMap.get(pid)).filter(Boolean);
        const primaryProj = projectIds[0] ? projectsMap.get(projectIds[0]) : null;
        const leader = rep.leader_id ? leadersMap.get(rep.leader_id) : null;
        return {
            ...rep,
            leader_name: leader?.name || null,
            leader_phone: leader?.phone || null,
            sales_project_ids: projectIds,
            sales_projects: assignedProjects,
            sales_project_name: primaryProj?.name || null,
            sales_project_logo: primaryProj?.logo || null,
            target_name: rep.target_id ? targetsMap.get(rep.target_id) || null : null,
        };
    });
    (0, response_1.SuccessResponse)(res, {
        sales: enrichedSales,
        pagination: {
            total: Number(totalCount),
            page,
            limit,
            totalPages: Math.ceil(Number(totalCount) / limit),
        },
    }, 200);
};
exports.getAllSalesReps = getAllSalesReps;
const getSalesRepById = async (req, res) => {
    const { id } = req.params;
    const [projectsList, targetsList, leadersList, repResult] = await Promise.all([
        db_2.salesDb.select({ id: schema_2.salesProjects.id, name: schema_2.salesProjects.name, logo: schema_2.salesProjects.logo, design: schema_2.salesProjects.design }).from(schema_2.salesProjects).catch(() => []),
        db_2.salesDb.select({ id: schema_2.targets.id, name: schema_2.targets.name }).from(schema_2.targets).catch(() => []),
        db_1.db.select({ id: schema_1.users.id, name: schema_1.users.name, phone: schema_1.users.phone }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.role, "leader_sales")).catch(() => []),
        db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, id), (0, drizzle_orm_1.eq)(schema_1.users.role, "sales"))).limit(1),
    ]);
    if (!repResult[0])
        throw new NotFound_1.NotFound("Sales Representative not found");
    const rep = repResult[0];
    const projectsMap = new Map(projectsList.map((p) => [p.id, p]));
    const targetsMap = new Map(targetsList.map((t) => [t.id, t.name]));
    const leadersMap = new Map(leadersList.map((l) => [l.id, l]));
    const projectIds = Array.isArray(rep.sales_project_ids)
        ? rep.sales_project_ids
        : rep.sales_project_id
            ? [rep.sales_project_id]
            : [];
    const assignedProjects = projectIds.map((pid) => projectsMap.get(pid)).filter(Boolean);
    const primaryProj = projectIds[0] ? projectsMap.get(projectIds[0]) : null;
    const leader = rep.leader_id ? leadersMap.get(rep.leader_id) : null;
    (0, response_1.SuccessResponse)(res, {
        sales: {
            ...rep,
            leader_name: leader?.name || null,
            leader_phone: leader?.phone || null,
            sales_project_ids: projectIds,
            sales_projects: assignedProjects,
            sales_project_name: primaryProj?.name || null,
            sales_project_logo: primaryProj?.logo || null,
            target_name: rep.target_id ? targetsMap.get(rep.target_id) || null : null,
        },
    }, 200);
};
exports.getSalesRepById = getSalesRepById;
const createSalesRep = async (req, res) => {
    const validated = await exports.createSalesRepSchema.parseAsync({ body: req.body });
    const { name, email, phone, password, status, leader_id, target_id } = validated.body;
    const projectIds = (0, salesAdmin_1.parseSalesProjectIds)(req.body);
    const existing = await db_1.db
        .select({ id: schema_1.users.id })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.users.email, email), (0, drizzle_orm_1.eq)(schema_1.users.phone, phone)))
        .limit(1);
    if (existing[0])
        throw new BadRequest_1.BadRequest("Email or Phone already exists");
    const savedImage = await handleImage(req, validated.body.image);
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    const id = (0, uuid_1.v4)();
    await db_1.db.insert(schema_1.users).values({
        id,
        name,
        email,
        phone,
        password: hashedPassword,
        image: savedImage || null,
        status,
        role: "sales",
        leader_id: leader_id || null,
        sales_project_id: projectIds[0] || null,
        sales_project_ids: projectIds,
        target_id: target_id || null,
    });
    await (0, salesAdmin_1.syncSalesProjectUsers)(id, projectIds);
    const created = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id)).limit(1);
    (0, response_1.SuccessResponse)(res, { message: "Sales Representative created successfully", sales: created[0] }, 201);
};
exports.createSalesRep = createSalesRep;
const updateSalesRep = async (req, res) => {
    const validated = await exports.updateSalesRepSchema.parseAsync({ params: req.params, body: req.body });
    const { id } = validated.params;
    const { name, email, phone, password, status, leader_id, target_id } = validated.body;
    const existing = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, id), (0, drizzle_orm_1.eq)(schema_1.users.role, "sales"))).limit(1);
    if (!existing[0])
        throw new NotFound_1.NotFound("Sales Representative not found");
    if (email && email !== existing[0].email) {
        const dupEmail = await db_1.db.select({ id: schema_1.users.id }).from(schema_1.users).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.email, email), (0, drizzle_orm_1.ne)(schema_1.users.id, id))).limit(1);
        if (dupEmail[0])
            throw new BadRequest_1.BadRequest("Email already exists");
    }
    if (phone && phone !== existing[0].phone) {
        const dupPhone = await db_1.db.select({ id: schema_1.users.id }).from(schema_1.users).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.phone, phone), (0, drizzle_orm_1.ne)(schema_1.users.id, id))).limit(1);
        if (dupPhone[0])
            throw new BadRequest_1.BadRequest("Phone already exists");
    }
    const savedImage = await handleImage(req, validated.body.image, existing[0].image);
    const updateData = {};
    if (name !== undefined)
        updateData.name = name;
    if (email !== undefined)
        updateData.email = email;
    if (phone !== undefined)
        updateData.phone = phone;
    if (status !== undefined)
        updateData.status = status;
    if (leader_id !== undefined)
        updateData.leader_id = leader_id || null;
    if (target_id !== undefined)
        updateData.target_id = target_id || null;
    if (savedImage !== undefined)
        updateData.image = savedImage;
    if (password)
        updateData.password = await bcrypt_1.default.hash(password, 10);
    if (req.body.sales_project_ids !== undefined || req.body.sales_project_id !== undefined) {
        const projectIds = (0, salesAdmin_1.parseSalesProjectIds)(req.body);
        updateData.sales_project_ids = projectIds;
        updateData.sales_project_id = projectIds[0] || null;
        await (0, salesAdmin_1.syncSalesProjectUsers)(id, projectIds);
    }
    if (Object.keys(updateData).length > 0) {
        await db_1.db.update(schema_1.users).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.users.id, id));
    }
    const updated = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id)).limit(1);
    (0, response_1.SuccessResponse)(res, { message: "Sales Representative updated successfully", sales: updated[0] }, 200);
};
exports.updateSalesRep = updateSalesRep;
const deleteSalesRep = async (req, res) => {
    const { id } = req.params;
    const existing = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, id), (0, drizzle_orm_1.eq)(schema_1.users.role, "sales"))).limit(1);
    if (!existing[0])
        throw new NotFound_1.NotFound("Sales Representative not found");
    if (existing[0].image)
        await (0, deleteImage_1.deletePhotoFromServer)(existing[0].image);
    await db_1.db.delete(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id));
    await db_2.salesDb.delete(schema_2.salesProjectUsers).where((0, drizzle_orm_1.eq)(schema_2.salesProjectUsers.user_id, id)).catch(() => { });
    (0, response_1.SuccessResponse)(res, { message: "Sales Representative deleted successfully" }, 200);
};
exports.deleteSalesRep = deleteSalesRep;
