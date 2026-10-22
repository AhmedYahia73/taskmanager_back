// src/controllers/Project/ProjectController.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { projects, users, tasks, settings, attendance, shifts, holidayRequests, projectUsers } from "../../models/schema"; 
import { SQL, or, eq, like, count, desc, sql, ne, lte, lt, gte, and, inArray } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { z } from "zod";
import { date } from "drizzle-orm/mysql-core";

// ==========================================
// 🎮 Controllers
// ==========================================

export const index = async (req: Request, res: Response) => {
  const role = req.user?.role as string | undefined;
  const isTechnicalOrSalesLeader = role === 'engineer' || role === 'leader_sales' || role === 'leader' || role === 'tester';
  const isAdmin = role === 'admin' || role === 'super_admin';
  const userId = req.user?.id;

  const { from, to } = req.query;
  const fromDateStr = from ? String(from).split('T')[0] : undefined;
  const toDateStr = to ? String(to).split('T')[0] : undefined;

  const buildTaskQuery = (
    statusCondition: SQL<unknown> | undefined = undefined,
    applyDateFilter: boolean = false
  ) => {
    let q = db.select({ value: count() }).from(tasks).leftJoin(projects, eq(tasks.project_id, projects.id));
    
    const conditions = [];
    if (statusCondition) conditions.push(statusCondition);
    if (isTechnicalOrSalesLeader && userId) {
      conditions.push(
        or(
          eq(projects.tester_id, userId as string),
          eq(tasks.user_id, userId as string)
        )!
      );
    }

    if (applyDateFilter) {
      if (fromDateStr) {
        conditions.push(gte(tasks.delivery_date, fromDateStr));
      }
      if (toDateStr) {
        conditions.push(lte(tasks.delivery_date, toDateStr));
      }
    }
    
    if (conditions.length > 0) {
      q = q.where(and(...conditions)) as any;
    }
    return q;
  };

  const [pendingTasksResult] = await buildTaskQuery(ne(tasks.status, "approve"), true);
  
  let allProjectsResult = { value: 0 };
  const projectsQuery = db.select({ value: count() }).from(projects);
  if (isTechnicalOrSalesLeader && userId) {
    const userProjectsSubquery = db.select({ project_id: projectUsers.project_id }).from(projectUsers).where(eq(projectUsers.user_id, userId));
    projectsQuery.where(
      or(
        eq(projects.tester_id, userId as string),
        inArray(projects.id, userProjectsSubquery)
      )!
    );
  }
  const [result] = await projectsQuery;
  allProjectsResult = result || { value: 0 };

  const [delayTasksResult] = await buildTaskQuery(
    and(
      lt(tasks.delivery_date, sql`CURRENT_DATE()`),
      ne(tasks.status, "approve")
    ),
    true
  ); 

  const [engineersResult] = await db
    .select({ value: count() })
    .from(users)
    .where(or(
      eq(users.role, "engineer"), 
      eq(users.role, "leader_sales")
    ));

  const [doneTasksResult] = await buildTaskQuery(eq(tasks.status, "done"), true);
  const [approveTasksResult] = await buildTaskQuery(eq(tasks.status, "approve"), true);
  const [totalTasksResult] = await buildTaskQuery(undefined, true);

  const [todayTasksResult] = await buildTaskQuery(
    and(
      eq(tasks.delivery_date, sql`CURRENT_DATE()`),
      ne(tasks.status, "approve")
    ),
    false
  ); 
  const [allTodayTasksResult] = await buildTaskQuery(eq(tasks.delivery_date, sql`CURRENT_DATE()`), false); 
  const [todayDoneTasksResult] = await buildTaskQuery(and(eq(tasks.delivery_date, sql`CURRENT_DATE()`), eq(tasks.status, "done")), false);
  const [todayApproveTasksResult] = await buildTaskQuery(and(eq(tasks.delivery_date, sql`CURRENT_DATE()`), eq(tasks.status, "approve")), false);

  SuccessResponse(res, { 
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
    from: fromDateStr || null,
    to: toDateStr || null
  }, 200);
};

export const usersName = async (req: Request, res: Response) => {

  const data = await db
    .select()
    .from(settings)
    .limit(1); 
    let user = "user";
    let leader = "leader";
    let admin = "admin";
    if(data.length > 0){
      user = data[0].user;
      leader = data[0].leader;
      admin = data[0].admin;
    }
  SuccessResponse(res, { 
    user, leader, admin
  }, 200);
};

export const pointsChart = async (req: Request, res: Response) => {
  let userId = req.user?.id;
  const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

  if (req.query.user_id && (req.user?.role === 'admin' || req.user?.role === 'super_admin')) {
    userId = req.query.user_id as string;
  }

  if (!userId) {
    throw new NotFound("User not found");
  }

  // Get total points from users table
  const [userRec] = await db.select({ points: users.points }).from(users).where(eq(users.id, userId)).limit(1);
  const totalPointsAllTime = userRec?.points ?? 0;

  // Get monthly points for the selected year
  const results = await db.execute(sql`
    SELECT MONTH(done_date) as month, SUM(points) as total_points
    FROM tasks
    WHERE user_id = ${userId}
      AND status = 'approve'
      AND YEAR(done_date) = ${year}
    GROUP BY MONTH(done_date)
  `);

  const rows = results[0] as unknown as { month: number; total_points: number | string }[];

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

  SuccessResponse(res, { 
    chartData,
    totalPointsAllTime
  }, 200);
};

export const leaderboard = async (req: Request, res: Response) => {
  const fromDate = req.query.from ? new Date(req.query.from as string) : undefined;
  const toDate = req.query.to ? new Date(req.query.to as string) : undefined;

  let fromDateStr = '';
  let toDateStr = '';

  if (fromDate && !isNaN(fromDate.getTime()) && toDate && !isNaN(toDate.getTime())) {
    fromDateStr = fromDate.toISOString().split('T')[0];
    toDateStr = toDate.toISOString().split('T')[0];
  } else {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    // Adjust for timezone offset to get correct local date string
    const offset = now.getTimezoneOffset() * 60000;
    fromDateStr = new Date(firstDay.getTime() - offset).toISOString().split('T')[0];
    toDateStr = new Date(lastDay.getTime() - offset).toISOString().split('T')[0];
  }

  // 1. Fetch leaderboard users with tasks status breakdown and whatsapp
  const results = await db.execute(sql`
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
    WHERE u.role IN ('engineer', 'leader_sales', 'leader', 'tester')
    GROUP BY u.id, u.name, u.image, u.phone, u.whatsapp, u.role, u.shift_id
    ORDER BY total_points DESC
  `);

  const rows = results[0] as unknown as { 
    id: string; 
    name: string; 
    image: string | null; 
    phone: string; 
    whatsapp: string | null;
    role?: string; 
    shift_id?: string | null;
    total_points: number | string;
    pending_tasks?: number | string;
    inprogress_tasks?: number | string;
    done_tasks?: number | string;
    approve_tasks?: number | string;
    edit_tasks?: number | string;
  }[];

  // 2. Fetch today's attendance, holidays, shifts, and settings for real-time attendance calculation
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const [todayAttendances, todayHolidays, allShifts, systemSettingsData] = await Promise.all([
    db.select().from(attendance).where(and(gte(attendance.from, todayStart), lte(attendance.from, todayEnd))),
    db.select().from(holidayRequests).where(and(gte(holidayRequests.date, todayStart), lte(holidayRequests.date, todayEnd), eq(holidayRequests.status, "approve"))),
    db.select().from(shifts),
    db.select().from(settings).limit(1)
  ]);

  const settingsRow = systemSettingsData[0] || {};
  const delayPermissionMinutes = Number(settingsRow.delay_premission_minutes || 0);
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDayStr = daysOfWeek[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const shiftsMap = new Map<string, any>();
  for (const s of allShifts) {
    let daysData: any = s.days;
    if (typeof daysData === 'string') {
      try { daysData = JSON.parse(daysData); } catch { daysData = {}; }
    }
    shiftsMap.set(s.id, { ...s, parsedDays: daysData });
  }

  const attendanceMap = new Map<string, typeof todayAttendances[0]>();
  for (const att of todayAttendances) {
    attendanceMap.set(att.userId, att);
  }

  const holidaySet = new Set<string>();
  for (const h of todayHolidays) {
    holidaySet.add(h.userId);
  }

  let leaderboardData: any[] = [];
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
        check_in_time: null as string | null,
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
          } else {
            attStatus.type = 'present_ontime';
            attStatus.label = 'On-Time';
            attStatus.color = 'emerald';
          }
        } else {
          attStatus.type = 'online';
          attStatus.label = 'Remote / Online';
          attStatus.color = 'blue';
        }
      } else if (hasHoliday) {
        attStatus.type = 'holiday';
        attStatus.label = 'Approved Leave';
        attStatus.color = 'purple';
      } else if (!isShiftActive) {
        attStatus.type = 'day_off';
        attStatus.label = 'Day Off';
        attStatus.color = 'slate';
      } else {
        if (currentMinutes < shiftStartMinutes) {
          attStatus.type = 'upcoming';
          attStatus.label = `Shift at ${shiftStartStr}`;
          attStatus.color = 'indigo';
        } else {
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

  SuccessResponse(res, { 
    leaderboard: leaderboardData
  }, 200);
};