"use strict";
// src/middlewares/resolveSalesProject.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSalesProject = void 0;
const BadRequest_1 = require("../Errors/BadRequest");
const Errors_1 = require("../Errors");
const db_1 = require("../models/db");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const resolveSalesProject = async (req, res, next) => {
    const projectId = req.headers["x-sales-project-id"] ||
        req.headers["sales_project_id"] ||
        req.query.sales_project_id ||
        req.query.project_id ||
        (req.body && req.body.sales_project_id) ||
        (req.body && req.body.project_id) ||
        req.user?.project_id;
    if (!projectId || typeof projectId !== "string" || projectId.trim() === "") {
        throw new BadRequest_1.BadRequest("Sales Project ID is required. Please select a sales project.");
    }
    const cleanProjectId = projectId.trim();
    // Verify project exists
    const [project] = await db_1.db
        .select({ id: schema_1.salesProjects.id })
        .from(schema_1.salesProjects)
        .where((0, drizzle_orm_1.eq)(schema_1.salesProjects.id, cleanProjectId))
        .limit(1);
    if (!project) {
        throw new BadRequest_1.BadRequest("Selected sales project does not exist.");
    }
    // If user is sales, leader_sales, or engineer, verify assignment
    const currentUser = req.user;
    if (currentUser && (currentUser.role === "sales" || currentUser.role === "leader_sales" || currentUser.role === "engineer")) {
        const [assignment] = await db_1.db
            .select({ id: schema_1.salesProjectUsers.id })
            .from(schema_1.salesProjectUsers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.salesProjectUsers.sales_project_id, cleanProjectId), (0, drizzle_orm_1.eq)(schema_1.salesProjectUsers.user_id, currentUser.id)))
            .limit(1);
        if (!assignment) {
            const [u] = await db_1.db
                .select({ sales_project_id: schema_1.users.sales_project_id, sales_project_ids: schema_1.users.sales_project_ids })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, currentUser.id))
                .limit(1);
            const userProjectIds = Array.isArray(u?.sales_project_ids)
                ? u.sales_project_ids.map(String)
                : [];
            if (u?.sales_project_id)
                userProjectIds.push(String(u.sales_project_id));
            if (!userProjectIds.includes(cleanProjectId)) {
                throw new Errors_1.UnauthorizedError("You are not assigned to this sales project.");
            }
        }
    }
    req.salesProjectId = cleanProjectId;
    next();
};
exports.resolveSalesProject = resolveSalesProject;
