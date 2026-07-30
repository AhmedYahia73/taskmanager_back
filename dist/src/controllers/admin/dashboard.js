"use strict";
// src/controllers/Project/ProjectController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersName = exports.index = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const schema_2 = require("../../models/schema");
// ==========================================
// 🎮 Controllers
// ==========================================
const index = async (req, res) => {
    const isTester = req.user?.role === 'tester';
    const isEngineer = req.user?.role === 'engineer';
    const userId = req.user?.id;
    const buildTaskQuery = (statusCondition = undefined) => {
        let q = db_1.db.select({ value: (0, drizzle_orm_1.count)() }).from(schema_1.tasks);
        if (isTester) {
            q = q.leftJoin(schema_1.projects, (0, drizzle_orm_1.eq)(schema_1.tasks.project_id, schema_1.projects.id));
        }
        const conditions = [];
        if (statusCondition)
            conditions.push(statusCondition);
        if (isTester && userId)
            conditions.push((0, drizzle_orm_1.eq)(schema_1.projects.tester_id, userId));
        if (isEngineer && userId)
            conditions.push((0, drizzle_orm_1.eq)(schema_1.tasks.user_id, userId));
        if (conditions.length > 0) {
            const combinedCondition = conditions.length === 1 ? conditions[0] : (0, drizzle_orm_1.sql) `${conditions[0]} AND ${conditions[1]}`;
            q = q.where(conditions.length > 2 ? (0, drizzle_orm_1.and)(...conditions) : combinedCondition);
        }
        return q;
    };
    const [pendingTasksResult] = await buildTaskQuery((0, drizzle_orm_1.ne)(schema_1.tasks.status, "approve"));
    let allProjectsResult = { value: 0 };
    if (!isEngineer) {
        const projectsQuery = db_1.db.select({ value: (0, drizzle_orm_1.count)() }).from(schema_1.projects);
        if (isTester && userId)
            projectsQuery.where((0, drizzle_orm_1.eq)(schema_1.projects.tester_id, userId));
        const [result] = await projectsQuery;
        allProjectsResult = result;
    }
    const [delayTasksResult] = await buildTaskQuery((0, drizzle_orm_1.lte)(schema_1.tasks.delivery_date, (0, drizzle_orm_1.sql) `NOW()`));
    const [engineersResult] = await db_1.db
        .select({ value: (0, drizzle_orm_1.count)() })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.users.role, "engineer"), (0, drizzle_orm_1.eq)(schema_1.users.role, "tester")));
    const [doneTasksResult] = await buildTaskQuery((0, drizzle_orm_1.eq)(schema_1.tasks.status, "done"));
    const [approveTasksResult] = await buildTaskQuery((0, drizzle_orm_1.eq)(schema_1.tasks.status, "approve"));
    const [totalTasksResult] = await buildTaskQuery();
    (0, response_1.SuccessResponse)(res, {
        pending_tasks: pendingTasksResult?.value ?? 0,
        all_projects: allProjectsResult?.value ?? 0,
        delay_tasks: delayTasksResult?.value ?? 0,
        engineers_count: engineersResult?.value ?? 0,
        done_tasks: doneTasksResult?.value ?? 0,
        approve_tasks: approveTasksResult?.value ?? 0,
        total_tasks: totalTasksResult?.value ?? 0,
    }, 200);
};
exports.index = index;
const usersName = async (req, res) => {
    const data = await db_1.db
        .select()
        .from(schema_2.settings)
        .limit(1);
    let user = "user";
    let leader = "leader";
    let admin = "admin";
    if (data.length > 0) {
        user = data[0].user;
        leader = data[0].leader;
        admin = data[0].admin;
    }
    (0, response_1.SuccessResponse)(res, {
        user, leader, admin
    }, 200);
};
exports.usersName = usersName;
