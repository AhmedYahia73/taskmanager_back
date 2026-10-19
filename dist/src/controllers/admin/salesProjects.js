"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSalesProject = exports.updateSalesProject = exports.createSalesProject = exports.getSalesProjectById = exports.getAllSalesProjects = exports.salesProjectIdSchema = exports.updateSalesProjectSchema = exports.createSalesProjectSchema = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const BadRequest_1 = require("../../Errors/BadRequest");
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
    }),
});
exports.updateSalesProjectSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, "Name cannot be empty").max(200).optional(),
        logo: zod_1.z.any().optional(),
    }),
});
exports.salesProjectIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }),
    }),
});
// ==========================================
// 🎮 Controllers
// ==========================================
// ✅ Get All Sales Projects (With Search & Pagination)
const getAllSalesProjects = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const search = req.query.search || "";
    const offset = (page - 1) * limit;
    let query = db_1.db
        .select()
        .from(schema_1.salesProjects)
        .orderBy((0, drizzle_orm_1.desc)(schema_1.salesProjects.createdAt))
        .$dynamic();
    let countQuery = db_1.db
        .select({ total: (0, drizzle_orm_1.count)() })
        .from(schema_1.salesProjects)
        .$dynamic();
    if (search) {
        query = query.where((0, drizzle_orm_1.like)(schema_1.salesProjects.name, `%${search}%`));
        countQuery = countQuery.where((0, drizzle_orm_1.like)(schema_1.salesProjects.name, `%${search}%`));
    }
    const [allSalesProjects, [{ total: totalCount }]] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery,
    ]);
    (0, response_1.SuccessResponse)(res, {
        salesProjects: allSalesProjects,
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
    const result = await db_1.db
        .select()
        .from(schema_1.salesProjects)
        .where((0, drizzle_orm_1.eq)(schema_1.salesProjects.id, id))
        .limit(1);
    if (!result[0]) {
        throw new NotFound_1.NotFound("Sales project not found");
    }
    (0, response_1.SuccessResponse)(res, { salesProject: result[0] }, 200);
};
exports.getSalesProjectById = getSalesProjectById;
// ✅ Create Sales Project
const createSalesProject = async (req, res) => {
    const validated = await exports.createSalesProjectSchema.parseAsync({ body: req.body });
    const { name, logo } = validated.body;
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
    await db_1.db.insert(schema_1.salesProjects).values({
        id,
        name,
        logo: savedLogo,
    });
    const created = await db_1.db
        .select()
        .from(schema_1.salesProjects)
        .where((0, drizzle_orm_1.eq)(schema_1.salesProjects.id, id))
        .limit(1);
    (0, response_1.SuccessResponse)(res, {
        message: "Sales project created successfully",
        salesProject: created[0],
    }, 201);
};
exports.createSalesProject = createSalesProject;
// ✅ Update Sales Project
const updateSalesProject = async (req, res) => {
    const validated = await exports.updateSalesProjectSchema.parseAsync({
        params: req.params,
        body: req.body,
    });
    const { id } = validated.params;
    const { name, logo } = validated.body;
    const existing = await db_1.db
        .select()
        .from(schema_1.salesProjects)
        .where((0, drizzle_orm_1.eq)(schema_1.salesProjects.id, id))
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
    if (Object.keys(updateData).length > 0) {
        await db_1.db.update(schema_1.salesProjects).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.salesProjects.id, id));
    }
    const updated = await db_1.db
        .select()
        .from(schema_1.salesProjects)
        .where((0, drizzle_orm_1.eq)(schema_1.salesProjects.id, id))
        .limit(1);
    (0, response_1.SuccessResponse)(res, {
        message: "Sales project updated successfully",
        salesProject: updated[0],
    }, 200);
};
exports.updateSalesProject = updateSalesProject;
// ✅ Delete Sales Project
const deleteSalesProject = async (req, res) => {
    const validated = await exports.salesProjectIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const existing = await db_1.db
        .select()
        .from(schema_1.salesProjects)
        .where((0, drizzle_orm_1.eq)(schema_1.salesProjects.id, id))
        .limit(1);
    if (!existing[0]) {
        throw new NotFound_1.NotFound("Sales project not found");
    }
    if (existing[0].logo) {
        await (0, deleteImage_1.deletePhotoFromServer)(existing[0].logo);
    }
    await db_1.db.delete(schema_1.salesProjects).where((0, drizzle_orm_1.eq)(schema_1.salesProjects.id, id));
    (0, response_1.SuccessResponse)(res, { message: "Sales project deleted successfully" }, 200);
};
exports.deleteSalesProject = deleteSalesProject;
