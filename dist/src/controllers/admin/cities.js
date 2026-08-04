"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCity = exports.updateCity = exports.createCity = exports.getCityById = exports.getAllCities = exports.CityIdSchema = exports.updateCitySchema = exports.createCitySchema = void 0;
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
exports.createCitySchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({ required_error: "Name is required" }).min(1).max(200),
        status: zod_1.z.boolean().optional(),
    }),
});
exports.updateCitySchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }).uuid("Invalid ID format"),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(200).optional(),
        status: zod_1.z.boolean().optional(),
    }),
});
exports.CityIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }).uuid("Invalid ID format"),
    }),
});
// ==========================================
// 🎮 Controllers
// ==========================================
const getAllCities = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;
    let query = db_1.db.select().from(schema_1.cities).orderBy((0, drizzle_orm_1.desc)(schema_1.cities.createdAt)).$dynamic();
    let countQuery = db_1.db.select({ total: (0, drizzle_orm_1.count)() }).from(schema_1.cities).$dynamic();
    if (search) {
        query = query.where((0, drizzle_orm_1.like)(schema_1.cities.name, `%${search}%`));
        countQuery = countQuery.where((0, drizzle_orm_1.like)(schema_1.cities.name, `%${search}%`));
    }
    const [allCities, [{ total: totalCount }]] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery
    ]);
    (0, response_1.SuccessResponse)(res, {
        cities: allCities,
        pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit)
        }
    }, 200);
};
exports.getAllCities = getAllCities;
const getCityById = async (req, res) => {
    const validated = await exports.CityIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const result = await db_1.db.select().from(schema_1.cities).where((0, drizzle_orm_1.eq)(schema_1.cities.id, id)).limit(1);
    if (!result[0])
        throw new NotFound_1.NotFound("City not found");
    (0, response_1.SuccessResponse)(res, { city: result[0] }, 200);
};
exports.getCityById = getCityById;
const createCity = async (req, res) => {
    const validated = await exports.createCitySchema.parseAsync({ body: req.body });
    const { name, status } = validated.body;
    const id = (0, uuid_1.v4)();
    await db_1.db.insert(schema_1.cities).values({ id, name, status: status ?? true });
    (0, response_1.SuccessResponse)(res, { message: "City created successfully" }, 201);
};
exports.createCity = createCity;
const updateCity = async (req, res) => {
    const validated = await exports.updateCitySchema.parseAsync({ params: req.params, body: req.body });
    const { id } = validated.params;
    const { name, status } = validated.body;
    const existing = await db_1.db.select().from(schema_1.cities).where((0, drizzle_orm_1.eq)(schema_1.cities.id, id)).limit(1);
    if (!existing[0])
        throw new NotFound_1.NotFound("City not found");
    const updateData = {};
    if (name !== undefined)
        updateData.name = name;
    if (status !== undefined)
        updateData.status = status;
    if (Object.keys(updateData).length > 0) {
        await db_1.db.update(schema_1.cities).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.cities.id, id));
    }
    (0, response_1.SuccessResponse)(res, { message: "City updated successfully" }, 200);
};
exports.updateCity = updateCity;
const deleteCity = async (req, res) => {
    const validated = await exports.CityIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const existing = await db_1.db.select().from(schema_1.cities).where((0, drizzle_orm_1.eq)(schema_1.cities.id, id)).limit(1);
    if (!existing[0])
        throw new NotFound_1.NotFound("City not found");
    await db_1.db.delete(schema_1.cities).where((0, drizzle_orm_1.eq)(schema_1.cities.id, id));
    (0, response_1.SuccessResponse)(res, { message: "City deleted successfully" }, 200);
};
exports.deleteCity = deleteCity;
