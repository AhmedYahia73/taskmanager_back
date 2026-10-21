"use strict";
// src/controllers/Project/ProjectController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaderboard = exports.pointsChart = exports.usersName = exports.index = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
// ==========================================
// 🎮 Controllers
// ==========================================
const index = async (req, res) => {
    const isTechnicalOrSalesLeader = req.user?.role === 'engineer' || req.user?.role === 'leader_sales';
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    const userId = req.user?.id;
    const buildTaskQuery = (statusCondition = undefined) => {
        let q = db_1.db.select({ value: (0, drizzle_orm_1.count)() }).from(schema_1.tasks).leftJoin(schema_1.projects, (0, drizzle_orm_1.eq)(schema_1.tasks.project_id, schema_1.projects.id));
        const conditions = [];
        if (statusCondition)
            conditions.push(statusCondition);
        if (isTechnicalOrSalesLeader && userId) {
            conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.projects.tester_id, userId), (0, drizzle_orm_1.eq)(schema_1.tasks.user_id, userId)));
        }
        if (conditions.length > 0) {
            q = q.where((0, drizzle_orm_1.and)(...conditions));
        }
        return q;
    };
    const [pendingTasksResult] = await buildTaskQuery((0, drizzle_orm_1.ne)(schema_1.tasks.status, "approve"));
    let allProjectsResult = { value: 0 };
    const projectsQuery = db_1.db.select({ value: (0, drizzle_orm_1.count)() }).from(schema_1.projects);
    if (isTechnicalOrSalesLeader && userId) {
        const userProjectsSubquery = db_1.db.select({ project_id: schema_1.projectUsers.project_id }).from(schema_1.projectUsers).where((0, drizzle_orm_1.eq)(schema_1.projectUsers.user_id, userId));
        projectsQuery.where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.projects.tester_id, userId), (0, drizzle_orm_1.inArray)(schema_1.projects.id, userProjectsSubquery)));
    }
    const [result] = await projectsQuery;
    allProjectsResult = result || { value: 0 };
    const [delayTasksResult] = await buildTaskQuery((0, drizzle_orm_1.and)((0, drizzle_orm_1.lt)(schema_1.tasks.delivery_date, (0, drizzle_orm_1.sql) `CURRENT_DATE()`), (0, drizzle_orm_1.ne)(schema_1.tasks.status, "approve")));
    const [engineersResult] = await db_1.db
        .select({ value: (0, drizzle_orm_1.count)() })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.users.role, "engineer"), (0, drizzle_orm_1.eq)(schema_1.users.role, "leader_sales")));
    const [doneTasksResult] = await buildTaskQuery((0, drizzle_orm_1.eq)(schema_1.tasks.status, "done"));
    const [approveTasksResult] = await buildTaskQuery((0, drizzle_orm_1.eq)(schema_1.tasks.status, "approve"));
    const [totalTasksResult] = await buildTaskQuery();
    const [todayTasksResult] = await buildTaskQuery((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tasks.delivery_date, (0, drizzle_orm_1.sql) `CURRENT_DATE()`), (0, drizzle_orm_1.ne)(schema_1.tasks.status, "approve")));
    const [allTodayTasksResult] = await buildTaskQuery((0, drizzle_orm_1.eq)(schema_1.tasks.delivery_date, (0, drizzle_orm_1.sql) `CURRENT_DATE()`));
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
        all_today_tasks: allTodayTasksResult?.value ?? 0,
        today_done_tasks: todayDoneTasksResult?.value ?? 0,
        today_approve_tasks: todayApproveTasksResult?.value ?? 0,
    }, 200);
};
exports.index = index;
const usersName = async (req, res) => {
    const data = await db_1.db
        .select()
        .from(schema_1.settings)
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
    if (req.query.user_id && (req.user?.role === 'admin' || req.user?.role === 'super_admin')) {
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
    // 1. Fetch leaderboard users with tasks status breakdown and whatsapp
    const results = await db_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT 
      u.id, 
      u.name, 
      u.image, 
      u.phone, 
      u.whatsapp,
      u.role, 
      u.shift_id,
      COALESCE(SUM(t.points), 0) as total_points,
      (SELECT COUNT(*) FROM tasks WHERE tasks.user_id = u.id AND tasks.status = 'pending') as pending_tasks,
      (SELECT COUNT(*) FROM tasks WHERE tasks.user_id = u.id AND tasks.status = 'inprogress') as inprogress_tasks,
      (SELECT COUNT(*) FROM tasks WHERE tasks.user_id = u.id AND tasks.status = 'done') as done_tasks,
      (SELECT COUNT(*) FROM tasks WHERE tasks.user_id = u.id AND tasks.status = 'approve') as approve_tasks,
      (SELECT COUNT(*) FROM tasks WHERE tasks.user_id = u.id AND tasks.status = 'edit') as edit_tasks
    FROM users u
    LEFT JOIN tasks t ON u.id = t.user_id 
      AND t.status = 'approve' 
      AND t.done_date >= ${fromDateStr} 
      AND t.done_date <= ${toDateStr}
    WHERE u.role IN ('engineer', 'leader_sales')
    GROUP BY u.id, u.name, u.image, u.phone, u.whatsapp, u.role, u.shift_id
    ORDER BY total_points DESC
  `);
    const rows = results[0];
    // 2. Fetch today's attendance, holidays, shifts, and settings for real-time attendance calculation
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const [todayAttendances, todayHolidays, allShifts, systemSettingsData] = await Promise.all([
        db_1.db.select().from(schema_1.attendance).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.attendance.from, todayStart), (0, drizzle_orm_1.lte)(schema_1.attendance.from, todayEnd))),
        db_1.db.select().from(schema_1.holidayRequests).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.holidayRequests.date, todayStart), (0, drizzle_orm_1.lte)(schema_1.holidayRequests.date, todayEnd), (0, drizzle_orm_1.eq)(schema_1.holidayRequests.status, "approve"))),
        db_1.db.select().from(schema_1.shifts),
        db_1.db.select().from(schema_1.settings).limit(1)
    ]);
    const settingsRow = systemSettingsData[0] || {};
    const delayPermissionMinutes = Number(settingsRow.delay_premission_minutes || 0);
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayStr = daysOfWeek[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const shiftsMap = new Map();
    for (const s of allShifts) {
        let daysData = s.days;
        if (typeof daysData === 'string') {
            try {
                daysData = JSON.parse(daysData);
            }
            catch {
                daysData = {};
            }
        }
        shiftsMap.set(s.id, { ...s, parsedDays: daysData });
    }
    const attendanceMap = new Map();
    for (const att of todayAttendances) {
        attendanceMap.set(att.userId, att);
    }
    const holidaySet = new Set();
    for (const h of todayHolidays) {
        holidaySet.add(h.userId);
    }
    let leaderboardData = [];
    if (Array.isArray(rows)) {
        leaderboardData = rows.map(r => {
            const att = attendanceMap.get(r.id);
            const hasHoliday = holidaySet.has(r.id);
            const userShift = r.shift_id ? shiftsMap.get(r.shift_id) : null;
            const todayShiftConfig = userShift?.parsedDays?.[currentDayStr];
            let shiftStartMinutes = 9 * 60; // Default 09:00 AM
            let shiftStartStr = "09:00";
            let isShiftActive = true;
            if (todayShiftConfig) {
                isShiftActive = todayShiftConfig.active !== false && todayShiftConfig.active !== "false";
                if (todayShiftConfig.from) {
                    shiftStartStr = todayShiftConfig.from;
                    const [h, m] = todayShiftConfig.from.split(':').map(Number);
                    if (!isNaN(h)) {
                        shiftStartMinutes = h * 60 + (isNaN(m) ? 0 : m);
                    }
                }
            }
            let attStatus = {
                type: 'upcoming', // 'present_ontime' | 'present_late' | 'online' | 'absent' | 'upcoming' | 'holiday' | 'day_off'
                label: 'Shift Upcoming',
                color: 'indigo',
                check_in_time: null,
                late_minutes: 0,
                shift_start: shiftStartStr
            };
            if (att) {
                const attDate = new Date(att.from);
                attStatus.check_in_time = attDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                if (att.onsite) {
                    const attMinutes = attDate.getHours() * 60 + attDate.getMinutes();
                    const diffMinutes = attMinutes - shiftStartMinutes;
                    if (diffMinutes > delayPermissionMinutes) {
                        attStatus.type = 'present_late';
                        attStatus.label = `Late (+${diffMinutes}m)`;
                        attStatus.color = 'amber';
                        attStatus.late_minutes = diffMinutes;
                    }
                    else {
                        attStatus.type = 'present_ontime';
                        attStatus.label = 'On-Time';
                        attStatus.color = 'emerald';
                    }
                }
                else {
                    attStatus.type = 'online';
                    attStatus.label = 'Remote / Online';
                    attStatus.color = 'blue';
                }
            }
            else if (hasHoliday) {
                attStatus.type = 'holiday';
                attStatus.label = 'Approved Leave';
                attStatus.color = 'purple';
            }
            else if (!isShiftActive) {
                attStatus.type = 'day_off';
                attStatus.label = 'Day Off';
                attStatus.color = 'slate';
            }
            else {
                if (currentMinutes < shiftStartMinutes) {
                    attStatus.type = 'upcoming';
                    attStatus.label = `Shift at ${shiftStartStr}`;
                    attStatus.color = 'indigo';
                }
                else {
                    attStatus.type = 'absent';
                    attStatus.label = 'Absent';
                    attStatus.color = 'rose';
                }
            }
            const pendingCount = Number(r.pending_tasks || 0);
            const inprogressCount = Number(r.inprogress_tasks || 0);
            const doneCount = Number(r.done_tasks || 0);
            const approveCount = Number(r.approve_tasks || 0);
            const editCount = Number(r.edit_tasks || 0);
            const totalCount = pendingCount + inprogressCount + doneCount + approveCount + editCount;
            return {
                id: r.id,
                name: r.name,
                image: r.image,
                phone: r.phone,
                whatsapp: r.whatsapp || null,
                role: r.role,
                total_points: Number(r.total_points),
                today_attendance: attStatus,
                tasks_stats: {
                    pending: pendingCount,
                    inprogress: inprogressCount,
                    done: doneCount,
                    approve: approveCount,
                    edit: editCount,
                    total: totalCount
                }
            };
        });
    }
    (0, response_1.SuccessResponse)(res, {
        leaderboard: leaderboardData
    }, 200);
};
exports.leaderboard = leaderboard;
