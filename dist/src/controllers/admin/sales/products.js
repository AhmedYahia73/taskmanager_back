"use strict";
// src/controllers/admin/sales/products.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getAllProducts = exports.ProductIdSchema = exports.updateProductSchema = exports.createProductSchema = void 0;
const db_1 = require("../../../models/db");
const schema_1 = require("../../../models/schema");
const response_1 = require("../../../utils/response");
const NotFound_1 = require("../../../Errors/NotFound");
const zod_1 = require("zod");
const drizzle_orm_1 = require("drizzle-orm");
// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
const pointSchema = zod_1.z.object({
    point: zod_1.z.number({ required_error: "Point value is required" }).min(0),
    duration: zod_1.z.string({ required_error: "Duration is required" })
});
exports.createProductSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({ required_error: "Name is required" }).min(1).max(255),
        feez: zod_1.z.number().optional().default(0),
        description: zod_1.z.string().max(1000).optional().nullable(),
        demo_link: zod_1.z.string().max(200).optional().nullable(),
        points: zod_1.z.array(pointSchema, { required_error: "Points array is required" }).min(1)
    }),
});
exports.updateProductSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(255).optional(),
        feez: zod_1.z.number().optional(),
        description: zod_1.z.string().max(1000).optional().nullable(),
        demo_link: zod_1.z.string().max(200).optional().nullable(),
        points: zod_1.z.array(pointSchema).optional()
    }),
});
exports.ProductIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }),
    }),
});
const getProjectId = (req) => {
    return (req.salesProjectId || req.headers["x-sales-project-id"] || req.user?.project_id);
};
// ==========================================
// 🎮 Controllers
// ==========================================
// ✅ Get All Products
const getAllProducts = async (req, res) => {
    const projectId = getProjectId(req);
    let query = db_1.db.select().from(schema_1.products).$dynamic();
    if (projectId) {
        query = query.where((0, drizzle_orm_1.eq)(schema_1.products.sales_project_id, projectId));
    }
    const allProducts = await query.orderBy((0, drizzle_orm_1.desc)(schema_1.products.createdAt));
    (0, response_1.SuccessResponse)(res, { allProducts }, 200);
};
exports.getAllProducts = getAllProducts;
// ✅ Get Product By ID
const getProductById = async (req, res) => {
    const validated = await exports.ProductIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const projectId = getProjectId(req);
    const whereConditions = [(0, drizzle_orm_1.eq)(schema_1.products.id, id)];
    if (projectId) {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.products.sales_project_id, projectId));
    }
    const productRaw = await db_1.db
        .select()
        .from(schema_1.products)
        .where((0, drizzle_orm_1.and)(...whereConditions))
        .limit(1);
    if (!productRaw[0]) {
        throw new NotFound_1.NotFound("Product not found");
    }
    (0, response_1.SuccessResponse)(res, { product: productRaw[0] }, 200);
};
exports.getProductById = getProductById;
// ✅ Create Product
const createProduct = async (req, res) => {
    const validated = await exports.createProductSchema.parseAsync({ body: req.body });
    const { name, feez, description, demo_link, points } = validated.body;
    const projectId = getProjectId(req);
    await db_1.db.insert(schema_1.products).values({
        name,
        feez,
        description: description || null,
        demo_link: demo_link || null,
        points,
        sales_project_id: projectId,
    });
    (0, response_1.SuccessResponse)(res, { message: "Product created successfully" }, 201);
};
exports.createProduct = createProduct;
// ✅ Update Product
const updateProduct = async (req, res) => {
    const validated = await exports.updateProductSchema.parseAsync({
        params: req.params,
        body: req.body,
    });
    const { id } = validated.params;
    const { name, feez, description, demo_link, points } = validated.body;
    const projectId = getProjectId(req);
    const whereConditions = [(0, drizzle_orm_1.eq)(schema_1.products.id, id)];
    if (projectId) {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.products.sales_project_id, projectId));
    }
    const existingProduct = await db_1.db
        .select()
        .from(schema_1.products)
        .where((0, drizzle_orm_1.and)(...whereConditions))
        .limit(1);
    if (!existingProduct[0]) {
        throw new NotFound_1.NotFound("Product not found");
    }
    const updateData = {};
    if (name !== undefined)
        updateData.name = name;
    if (feez !== undefined)
        updateData.feez = feez;
    if (description !== undefined)
        updateData.description = description;
    if (demo_link !== undefined)
        updateData.demo_link = demo_link;
    if (points !== undefined)
        updateData.points = points;
    if (Object.keys(updateData).length > 0) {
        await db_1.db.update(schema_1.products).set(updateData).where((0, drizzle_orm_1.and)(...whereConditions));
    }
    (0, response_1.SuccessResponse)(res, { message: "Product updated successfully" }, 200);
};
exports.updateProduct = updateProduct;
// ✅ Delete Product
const deleteProduct = async (req, res) => {
    const validated = await exports.ProductIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const projectId = getProjectId(req);
    const whereConditions = [(0, drizzle_orm_1.eq)(schema_1.products.id, id)];
    if (projectId) {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.products.sales_project_id, projectId));
    }
    const existingProduct = await db_1.db
        .select()
        .from(schema_1.products)
        .where((0, drizzle_orm_1.and)(...whereConditions))
        .limit(1);
    if (!existingProduct[0]) {
        throw new NotFound_1.NotFound("Product not found");
    }
    await db_1.db.delete(schema_1.products).where((0, drizzle_orm_1.and)(...whereConditions));
    (0, response_1.SuccessResponse)(res, { message: "Product deleted successfully" }, 200);
};
exports.deleteProduct = deleteProduct;
