"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectAccessToken = exports.deleteSalesProject = exports.updateSalesProject = exports.createSalesProject = exports.getSalesProjectById = exports.getAllSalesProjects = exports.getAvailableSalesUsers = exports.salesProjectIdSchema = exports.updateSalesProjectSchema = exports.createSalesProjectSchema = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const db_2 = require("../../models/sales/db");
const schema_2 = require("../../models/sales/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const zod_1 = require("zod");
const upload_1 = require("../../middlewares/upload");
const handleImages_1 = require("../../utils/handleImages");
const deleteImage_1 = require("../../utils/deleteImage");
// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
exports.createSalesProjectSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z
            .string({ required_error: "Name is required" })
            .min(1, "Name cannot be empty")
            .max(200, "Name cannot exceed 200 characters"),
        logo: zod_1.z.any().optional(),
        design: zod_1.z.enum(["design 1", "design 2"]).optional().default("design 1"),
        user_ids: zod_1.z.any().optional(),
    }),
});
exports.updateSalesProjectSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, "Name cannot be empty").max(200).optional(),
        logo: zod_1.z.any().optional(),
        design: zod_1.z.enum(["design 1", "design 2"]).optional(),
        user_ids: zod_1.z.any().optional(),
    }),
});
exports.salesProjectIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }),
    }),
});
// Helper to parse user_ids from body (handles JSON string, array, or comma-separated)
const parseUserIds = (raw) => {
    if (!raw)
        return [];
    if (Array.isArray(raw))
        return raw.filter(Boolean);
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed))
                return parsed.filter(Boolean);
        }
        catch {
            return raw.split(",").map((s) => s.trim()).filter(Boolean);
        }
    }
    return [];
};
// ==========================================
// 🎮 Controllers (Operating on Sales DB)
// ==========================================
// ✅ Get Available Users (Leaders & Sales) for Project Assignment
const getAvailableSalesUsers = async (req, res) => {
    const availableUsers = await db_1.db
        .select({
        id: schema_1.users.id,
        name: schema_1.users.name,
        email: schema_1.users.email,
        phone: schema_1.users.phone,
        role: schema_1.users.role,
        image: schema_1.users.image,
    })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.users.role, "leader_sales"), (0, drizzle_orm_1.eq)(schema_1.users.role, "sales")));
    (0, response_1.SuccessResponse)(res, { users: availableUsers }, 200);
};
exports.getAvailableSalesUsers = getAvailableSalesUsers;
// ✅ Get All Sales Projects (With Search & Pagination)
const getAllSalesProjects = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const search = req.query.search || "";
    const offset = (page - 1) * limit;
    const currentUser = req.user;
    let query = db_2.salesDb
        .select()
        .from(schema_2.salesProjects)
        .orderBy((0, drizzle_orm_1.desc)(schema_2.salesProjects.createdAt))
        .$dynamic();
    let countQuery = db_2.salesDb
        .select({ total: (0, drizzle_orm_1.count)() })
        .from(schema_2.salesProjects)
        .$dynamic();
    // If user is sales or leader, filter ONLY to their assigned projects from sales_project_users
    if (currentUser?.role === "sales" || currentUser?.role === "leader_sales") {
        const assigned = await db_2.salesDb
            .select({ sales_project_id: schema_2.salesProjectUsers.sales_project_id })
            .from(schema_2.salesProjectUsers)
            .where((0, drizzle_orm_1.eq)(schema_2.salesProjectUsers.user_id, currentUser.id));
        const assignedIds = Array.from(new Set(assigned.map((a) => a.sales_project_id).filter(Boolean)));
        if (assignedIds.length === 0) {
            return (0, response_1.SuccessResponse)(res, {
                salesProjects: [],
                pagination: {
                    total: 0,
                    page,
                    limit,
                    totalPages: 0,
                },
            }, 200);
        }
        query = query.where((0, drizzle_orm_1.inArray)(schema_2.salesProjects.id, assignedIds));
        countQuery = countQuery.where((0, drizzle_orm_1.inArray)(schema_2.salesProjects.id, assignedIds));
    }
    if (search) {
        query = query.where((0, drizzle_orm_1.like)(schema_2.salesProjects.name, `%${search}%`));
        countQuery = countQuery.where((0, drizzle_orm_1.like)(schema_2.salesProjects.name, `%${search}%`));
    }
    const [allSalesProjects, [{ total: totalCount }]] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery,
    ]);
    // Fetch assigned users for each project
    const projectIds = allSalesProjects.map((p) => p.id);
    const projectUsersMap = {};
    if (projectIds.length > 0) {
        const pUsers = await db_2.salesDb
            .select({
            sales_project_id: schema_2.salesProjectUsers.sales_project_id,
            user_id: schema_2.salesProjectUsers.user_id,
        })
            .from(schema_2.salesProjectUsers)
            .where((0, drizzle_orm_1.inArray)(schema_2.salesProjectUsers.sales_project_id, projectIds));
        for (const pu of pUsers) {
            if (pu.sales_project_id) {
                if (!projectUsersMap[pu.sales_project_id]) {
                    projectUsersMap[pu.sales_project_id] = [];
                }
                projectUsersMap[pu.sales_project_id].push(pu.user_id);
            }
        }
    }
    const enriched = allSalesProjects.map((p) => ({
        ...p,
        user_ids: projectUsersMap[p.id] || [],
        members_count: (projectUsersMap[p.id] || []).length,
    }));
    (0, response_1.SuccessResponse)(res, {
        salesProjects: enriched,
        pagination: {
            total: Number(totalCount),
            page,
            limit,
            totalPages: Math.ceil(Number(totalCount) / limit),
        },
    }, 200);
};
exports.getAllSalesProjects = getAllSalesProjects;
// ✅ Get Sales Project By ID
const getSalesProjectById = async (req, res) => {
    const validated = await exports.salesProjectIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const currentUser = req.user;
    // If sales or leader, make sure they belong to this project
    if (currentUser?.role === "sales" || currentUser?.role === "leader_sales") {
        const userInProj = await db_2.salesDb
            .select({ id: schema_2.salesProjectUsers.id })
            .from(schema_2.salesProjectUsers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_2.salesProjectUsers.sales_project_id, id), (0, drizzle_orm_1.eq)(schema_2.salesProjectUsers.user_id, currentUser.id)))
            .limit(1);
        if (!userInProj[0]) {
            throw new Errors_1.UnauthorizedError("You do not have access to this sales project");
        }
    }
    const result = await db_2.salesDb
        .select()
        .from(schema_2.salesProjects)
        .where((0, drizzle_orm_1.eq)(schema_2.salesProjects.id, id))
        .limit(1);
    if (!result[0]) {
        throw new NotFound_1.NotFound("Sales project not found");
    }
    const assigned = await db_2.salesDb
        .select({ user_id: schema_2.salesProjectUsers.user_id })
        .from(schema_2.salesProjectUsers)
        .where((0, drizzle_orm_1.eq)(schema_2.salesProjectUsers.sales_project_id, id));
    (0, response_1.SuccessResponse)(res, {
        salesProject: {
            ...result[0],
            user_ids: assigned.map((a) => a.user_id),
        },
    }, 200);
};
exports.getSalesProjectById = getSalesProjectById;
// ✅ Create Sales Project (Admin only)
const createSalesProject = async (req, res) => {
    if (req.user?.role !== "admin" && req.user?.role !== "super_admin") {
        throw new Errors_1.UnauthorizedError("Only admins can create sales projects");
    }
    const validated = await exports.createSalesProjectSchema.parseAsync({ body: req.body });
    const { name, logo, design } = validated.body;
    const userIds = parseUserIds(req.body.user_ids);
    let savedLogo = null;
    if (req.file) {
        savedLogo = (0, upload_1.getFileUrl)(req, req.file, "salesProjects");
    }
    else if (logo && typeof logo === "string" && logo.startsWith("data:")) {
        const result = await (0, handleImages_1.saveBase64Image)(req, logo, "salesProjects");
        savedLogo = result.url;
    }
    else if (typeof logo === "string" &&
        logo.trim() !== "" &&
        logo !== "null" &&
        logo !== "undefined") {
        savedLogo = logo.trim();
    }
    if (!savedLogo) {
        throw new BadRequest_1.BadRequest("Logo is required");
    }
    const id = (0, uuid_1.v4)();
    await db_2.salesDb.insert(schema_2.salesProjects).values({
        id,
        name,
        logo: savedLogo,
        design: design || "design 1",
    });
    // Assign users to project in sales_project_users
    if (userIds.length > 0) {
        const userRows = userIds.map((userId) => ({
            id: (0, uuid_1.v4)(),
            sales_project_id: id,
            user_id: userId,
        }));
        await db_2.salesDb.insert(schema_2.salesProjectUsers).values(userRows);
    }
    const created = await db_2.salesDb
        .select()
        .from(schema_2.salesProjects)
        .where((0, drizzle_orm_1.eq)(schema_2.salesProjects.id, id))
        .limit(1);
    (0, response_1.SuccessResponse)(res, {
        message: "Sales project created successfully",
        salesProject: {
            ...created[0],
            user_ids: userIds,
        },
    }, 201);
};
exports.createSalesProject = createSalesProject;
// ✅ Update Sales Project (Admin only)
const updateSalesProject = async (req, res) => {
    if (req.user?.role !== "admin" && req.user?.role !== "super_admin") {
        throw new Errors_1.UnauthorizedError("Only admins can update sales projects");
    }
    const validated = await exports.updateSalesProjectSchema.parseAsync({
        params: req.params,
        body: req.body,
    });
    const { id } = validated.params;
    const { name, logo, design } = validated.body;
    const existing = await db_2.salesDb
        .select()
        .from(schema_2.salesProjects)
        .where((0, drizzle_orm_1.eq)(schema_2.salesProjects.id, id))
        .limit(1);
    if (!existing[0]) {
        throw new NotFound_1.NotFound("Sales project not found");
    }
    let finalLogo = existing[0].logo;
    if (req.file) {
        finalLogo = (0, upload_1.getFileUrl)(req, req.file, "salesProjects");
        if (existing[0].logo) {
            await (0, deleteImage_1.deletePhotoFromServer)(existing[0].logo);
        }
    }
    else if (logo && typeof logo === "string" && logo.startsWith("data:")) {
        const result = await (0, handleImages_1.saveBase64Image)(req, logo, "salesProjects");
        finalLogo = result.url;
        if (existing[0].logo) {
            await (0, deleteImage_1.deletePhotoFromServer)(existing[0].logo);
        }
    }
    else if (typeof logo === "string" &&
        logo.trim() !== "" &&
        logo !== "null" &&
        logo !== "undefined" &&
        logo !== existing[0].logo) {
        finalLogo = logo.trim();
    }
    if (!finalLogo || finalLogo.trim() === "") {
        throw new BadRequest_1.BadRequest("Logo is required and cannot be empty");
    }
    const updateData = {};
    if (name !== undefined)
        updateData.name = name;
    if (finalLogo !== undefined)
        updateData.logo = finalLogo;
    if (design !== undefined)
        updateData.design = design;
    if (Object.keys(updateData).length > 0) {
        await db_2.salesDb.update(schema_2.salesProjects).set(updateData).where((0, drizzle_orm_1.eq)(schema_2.salesProjects.id, id));
    }
    // Update assigned users if passed
    if (req.body.user_ids !== undefined) {
        const userIds = parseUserIds(req.body.user_ids);
        await db_2.salesDb.delete(schema_2.salesProjectUsers).where((0, drizzle_orm_1.eq)(schema_2.salesProjectUsers.sales_project_id, id));
        if (userIds.length > 0) {
            const userRows = userIds.map((userId) => ({
                id: (0, uuid_1.v4)(),
                sales_project_id: id,
                user_id: userId,
            }));
            await db_2.salesDb.insert(schema_2.salesProjectUsers).values(userRows);
        }
    }
    const updated = await db_2.salesDb
        .select()
        .from(schema_2.salesProjects)
        .where((0, drizzle_orm_1.eq)(schema_2.salesProjects.id, id))
        .limit(1);
    const assigned = await db_2.salesDb
        .select({ user_id: schema_2.salesProjectUsers.user_id })
        .from(schema_2.salesProjectUsers)
        .where((0, drizzle_orm_1.eq)(schema_2.salesProjectUsers.sales_project_id, id));
    (0, response_1.SuccessResponse)(res, {
        message: "Sales project updated successfully",
        salesProject: {
            ...updated[0],
            user_ids: assigned.map((a) => a.user_id),
        },
    }, 200);
};
exports.updateSalesProject = updateSalesProject;
// ✅ Delete Sales Project (Admin only)
const deleteSalesProject = async (req, res) => {
    if (req.user?.role !== "admin" && req.user?.role !== "super_admin") {
        throw new Errors_1.UnauthorizedError("Only admins can delete sales projects");
    }
    const validated = await exports.salesProjectIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const existing = await db_2.salesDb
        .select()
        .from(schema_2.salesProjects)
        .where((0, drizzle_orm_1.eq)(schema_2.salesProjects.id, id))
        .limit(1);
    if (!existing[0]) {
        throw new NotFound_1.NotFound("Sales project not found");
    }
    if (existing[0].logo) {
        await (0, deleteImage_1.deletePhotoFromServer)(existing[0].logo);
    }
    // Delete project users association
    await db_2.salesDb.delete(schema_2.salesProjectUsers).where((0, drizzle_orm_1.eq)(schema_2.salesProjectUsers.sales_project_id, id));
    await db_2.salesDb.delete(schema_2.salesProjects).where((0, drizzle_orm_1.eq)(schema_2.salesProjects.id, id));
    (0, response_1.SuccessResponse)(res, { message: "Sales project deleted successfully" }, 200);
};
exports.deleteSalesProject = deleteSalesProject;
// ✅ Generate SSO Access Token for Sales Dashboard (Admin / Leader / Sales)
const getProjectAccessToken = async (req, res) => {
    const { id } = req.params;
    const currentUser = req.user;
    if (!currentUser) {
        throw new Errors_1.UnauthorizedError("Authentication required");
    }
    const [project] = await db_2.salesDb
        .select()
        .from(schema_2.salesProjects)
        .where((0, drizzle_orm_1.eq)(schema_2.salesProjects.id, id))
        .limit(1);
    if (!project) {
        throw new NotFound_1.NotFound("Sales project not found");
    }
    // If user is sales or leader, check they are actually assigned to this project
    if (currentUser.role === "sales" || currentUser.role === "leader_sales") {
        const [membership] = await db_2.salesDb
            .select()
            .from(schema_2.salesProjectUsers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_2.salesProjectUsers.sales_project_id, id), (0, drizzle_orm_1.eq)(schema_2.salesProjectUsers.user_id, currentUser.id)))
            .limit(1);
        if (!membership) {
            throw new Errors_1.UnauthorizedError("You are not assigned to this sales project");
        }
    }
    let role = "admin";
    if (currentUser.role === "leader_sales") {
        role = "leader";
    }
    else if (currentUser.role === "sales") {
        role = "sales";
    }
    const payload = {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email || "",
        phone: currentUser.phone || "",
        role: role,
        project_id: id,
        project_name: project.name,
        project_logo: project.logo,
        project_design: project.design,
    };
    const JWT_SECRET = process.env.JWT_SECRET;
    const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: "7d" });
    let frontDomain = process.env.FRONT_ADMIN;
    if (role === "leader") {
        frontDomain = process.env.LEADER_ADMIN || "https://leadersales.wegostation.com";
    }
    else if (role === "sales") {
        frontDomain = process.env.SALES_ADMIN || "https://mainsales.wegostation.com";
    }
    else {
        frontDomain = process.env.FRONT_ADMIN || "https://adminsales.wegostation.com";
    }
    // Clean trailing slashes
    frontDomain = frontDomain.replace(/\/+$/, "");
    const redirectUrl = `${frontDomain}/home?token=${encodeURIComponent(token)}`;
    (0, response_1.SuccessResponse)(res, {
        token,
        redirectUrl,
        project: {
            id: project.id,
            name: project.name,
            logo: project.logo,
            design: project.design,
            role,
        },
    }, 200);
};
exports.getProjectAccessToken = getProjectAccessToken;
