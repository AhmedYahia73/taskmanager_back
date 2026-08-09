"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllDepartments = getAllDepartments;
exports.getDepartmentDependencies = getDepartmentDependencies;
exports.createDepartment = createDepartment;
exports.updateDepartment = updateDepartment;
exports.deleteDepartment = deleteDepartment;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const response_1 = require("../../utils/response");
const drizzle_orm_1 = require("drizzle-orm");
const Errors_1 = require("../../Errors");
async function getAllDepartments(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const offset = (page - 1) * limit;
    let query = db_1.db
        .select({
        id: schema_1.departments.id,
        name: schema_1.departments.name,
        description: schema_1.departments.description,
        status: schema_1.departments.status,
        zone_id: schema_1.departments.zone_id,
        manager_id: schema_1.departments.manager_id,
        zone_name: schema_1.zones.name,
        manager_name: schema_1.users.name,
        createdAt: schema_1.departments.createdAt,
    })
        .from(schema_1.departments)
        .leftJoin(schema_1.zones, (0, drizzle_orm_1.eq)(schema_1.departments.zone_id, schema_1.zones.id))
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.departments.manager_id, schema_1.users.id))
        .where((0, drizzle_orm_1.like)(schema_1.departments.name, `%${search}%`))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.departments.createdAt))
        .limit(limit)
        .offset(offset);
    let countQuery = db_1.db
        .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
        .from(schema_1.departments)
        .where((0, drizzle_orm_1.like)(schema_1.departments.name, `%${search}%`));
    const [data, totalCountResult] = await Promise.all([query, countQuery]);
    const total = totalCountResult[0]?.count || 0;
    return (0, response_1.SuccessResponse)(res, {
        departments: data,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    }, 200);
}
async function getDepartmentDependencies(req, res) {
    const zonesData = await db_1.db.select({ id: schema_1.zones.id, name: schema_1.zones.name }).from(schema_1.zones);
    const managersData = await db_1.db.select({ id: schema_1.users.id, name: schema_1.users.name }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.role, "engineer"));
    return (0, response_1.SuccessResponse)(res, {
        zones: zonesData,
        managers: managersData,
    }, 200);
}
async function createDepartment(req, res) {
    const body = req.body;
    await db_1.db.insert(schema_1.departments).values(body);
    return (0, response_1.SuccessResponse)(res, { message: "Department created successfully" }, 201);
}
async function updateDepartment(req, res) {
    const { id } = req.params;
    const body = req.body;
    const existing = await db_1.db.select().from(schema_1.departments).where((0, drizzle_orm_1.eq)(schema_1.departments.id, id)).limit(1);
    if (!existing[0]) {
        throw new Errors_1.NotFound("Department not found");
    }
    await db_1.db.update(schema_1.departments).set(body).where((0, drizzle_orm_1.eq)(schema_1.departments.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Department updated successfully" }, 200);
}
async function deleteDepartment(req, res) {
    const { id } = req.params;
    const existing = await db_1.db.select().from(schema_1.departments).where((0, drizzle_orm_1.eq)(schema_1.departments.id, id)).limit(1);
    if (!existing[0]) {
        throw new Errors_1.NotFound("Department not found");
    }
    await db_1.db.delete(schema_1.departments).where((0, drizzle_orm_1.eq)(schema_1.departments.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Department deleted successfully" }, 200);
}
