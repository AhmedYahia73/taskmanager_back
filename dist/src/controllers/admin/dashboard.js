"use strict";
// src/controllers/Project/ProjectController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaderboard = exports.pointsChart = exports.usersName = exports.index = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
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
    const [todayTasksResult] = await buildTaskQuery((0, drizzle_orm_1.eq)(schema_1.tasks.delivery_date, (0, drizzle_orm_1.sql) `CURRENT_DATE()`));
    const [todayDoneTasksResult] = await buildTaskQuery((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tasks.delivery_date, (0, drizzle_orm_1.sql) `CURRENT_DATE()`), (0, drizzle_orm_1.eq)(schema_1.tasks.status, "done")));
    const [todayApproveTasksResult] = await buildTaskQuery((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tasks.delivery_date, (0, drizzle_orm_1.sql) `CURRENT_DATE()`), (0, drizzle_orm_1.eq)(schema_1.tasks.status, "approve")));
    (0, response_1.SuccessResponse)(res, {
        pending_tasks: pendingTasksResult?.value ?? 0,
        all_projects: allProjectsResult?.value ?? 0,
        delay_tasks: delayTasksResult?.value ?? 0,
        engineers_count: engineersResult?.value ?? 0,
        done_tasks: doneTasksResult?.value ?? 0,
        approve_tasks: approveTasksResult?.value ?? 0,
        total_tasks: totalTasksResult?.value ?? 0,
        today_tasks: todayTasksResult?.value ?? 0,
        today_done_tasks: todayDoneTasksResult?.value ?? 0,
        today_approve_tasks: todayApproveTasksResult?.value ?? 0,
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
const pointsChart = async (req, res) => {
    let userId = req.user?.id;
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    if (req.query.user_id && (req.user?.role === 'admin' || req.user?.role === 'tester')) {
        userId = req.query.user_id;
    }
    if (!userId) {
        throw new NotFound_1.NotFound("User not found");
    }
    // Get total points from users table
    const [userRec] = await db_1.db.select({ points: schema_1.users.points }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
    const totalPointsAllTime = userRec?.points ?? 0;
    // Get monthly points for the selected year
    const results = await db_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT MONTH(done_date) as month, SUM(points) as total_points
    FROM tasks
    WHERE user_id = ${userId}
      AND status = 'approve'
      AND YEAR(done_date) = ${year}
    GROUP BY MONTH(done_date)
  `);
    const rows = results[0];
    const chartData = Array.from({ length: 12 }, (_, i) => ({
        name: new Date(2000, i, 1).toLocaleString('default', { month: 'short' }), // Jan, Feb, etc.
        points: 0
    }));
    if (Array.isArray(rows)) {
        rows.forEach(row => {
            if (row.month >= 1 && row.month <= 12) {
                chartData[row.month - 1].points = Number(row.total_points);
            }
        });
    }
    (0, response_1.SuccessResponse)(res, {
        chartData,
        totalPointsAllTime
    }, 200);
};
exports.pointsChart = pointsChart;
const leaderboard = async (req, res) => {
    const fromDate = req.query.from ? new Date(req.query.from) : undefined;
    const toDate = req.query.to ? new Date(req.query.to) : undefined;
    let fromDateStr = '';
    let toDateStr = '';
    if (fromDate && !isNaN(fromDate.getTime()) && toDate && !isNaN(toDate.getTime())) {
        fromDateStr = fromDate.toISOString().split('T')[0];
        toDateStr = toDate.toISOString().split('T')[0];
    }
    else {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        // Adjust for timezone offset to get correct local date string
        const offset = now.getTimezoneOffset() * 60000;
        fromDateStr = new Date(firstDay.getTime() - offset).toISOString().split('T')[0];
        toDateStr = new Date(lastDay.getTime() - offset).toISOString().split('T')[0];
    }
    const results = await db_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT u.id, u.name, u.image, u.phone, COALESCE(SUM(t.points), 0) as total_points
    FROM users u
    LEFT JOIN tasks t ON u.id = t.user_id 
      AND t.status = 'approve' 
      AND t.done_date >= ${fromDateStr} 
      AND t.done_date <= ${toDateStr}
    WHERE u.role IN ('engineer', 'tester')
    GROUP BY u.id, u.name, u.image, u.phone
    ORDER BY total_points DESC
  `);
    const rows = results[0];
    let leaderboardData = [];
    if (Array.isArray(rows)) {
        leaderboardData = rows.map(r => ({
            id: r.id,
            name: r.name,
            image: r.image,
            phone: r.phone,
            total_points: Number(r.total_points)
        }));
    }
    (0, response_1.SuccessResponse)(res, {
        leaderboard: leaderboardData
    }, 200);
};
exports.leaderboard = leaderboard;
