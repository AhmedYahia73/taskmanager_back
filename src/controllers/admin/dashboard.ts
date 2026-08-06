// src/controllers/Project/ProjectController.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { projects, users, tasks } from "../../models/schema"; 
import { SQL, or, eq, like, count, desc, sql, ne, lte, and } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { saveBase64Image } from "../../utils/handleImages";
import { deletePhotoFromServer } from "../../utils/deleteImage";
import { z } from "zod";
import { settings } from "../../models/schema"; 
import { date } from "drizzle-orm/mysql-core";

// ==========================================
// 🎮 Controllers
// ==========================================

export const index = async (req: Request, res: Response) => {
  const isTester = req.user?.role === 'tester';
  const isEngineer = req.user?.role === 'engineer';
  const userId = req.user?.id;


  const buildTaskQuery = (statusCondition: SQL<unknown> | undefined = undefined) => {
    let q = db.select({ value: count() }).from(tasks);
    
    if (isTester) {
      q = q.leftJoin(projects, eq(tasks.project_id, projects.id)) as any;
    }
    
    const conditions = [];
    if (statusCondition) conditions.push(statusCondition);
    if (isTester && userId) conditions.push(eq(projects.tester_id, userId as string));
    if (isEngineer && userId) conditions.push(eq(tasks.user_id, userId as string));
    
    if (conditions.length > 0) {
      const combinedCondition = conditions.length === 1 ? conditions[0] : sql`${conditions[0]} AND ${conditions[1]}`;
      q = q.where(conditions.length > 2 ? and(...conditions) : combinedCondition) as any;
    }
    return q;
  };

  const [pendingTasksResult] = await buildTaskQuery(ne(tasks.status, "approve"));
  
  let allProjectsResult = { value: 0 };
  if (!isEngineer) {
    const projectsQuery = db.select({ value: count() }).from(projects);
    if (isTester && userId) projectsQuery.where(eq(projects.tester_id, userId as string));
    const [result] = await projectsQuery;
    allProjectsResult = result;
  }

  const [delayTasksResult] = await buildTaskQuery(lte(tasks.delivery_date, sql`NOW()`)); 

  const [engineersResult] = await db
    .select({ value: count() })
    .from(users)
    .where(or(eq(users.role, "engineer"), eq(users.role, "tester")));

  const [doneTasksResult] = await buildTaskQuery(eq(tasks.status, "done"));
  const [approveTasksResult] = await buildTaskQuery(eq(tasks.status, "approve"));
  const [totalTasksResult] = await buildTaskQuery();

  const [todayTasksResult] = await buildTaskQuery(eq(tasks.delivery_date, sql`CURRENT_DATE()`)); 
  const [todayDoneTasksResult] = await buildTaskQuery(and(eq(tasks.delivery_date, sql`CURRENT_DATE()`), eq(tasks.status, "done")));
  const [todayApproveTasksResult] = await buildTaskQuery(and(eq(tasks.delivery_date, sql`CURRENT_DATE()`), eq(tasks.status, "approve")));

  SuccessResponse(res, { 
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

  if (req.query.user_id && (req.user?.role === 'admin' || req.user?.role === 'tester')) {
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

  const results = await db.execute(sql`
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

  const rows = results[0] as unknown as { id: string; name: string; image: string | null; phone: string; total_points: number | string }[];

  let leaderboardData: any[] = [];
  if (Array.isArray(rows)) {
    leaderboardData = rows.map(r => ({
      id: r.id,
      name: r.name,
      image: r.image,
      phone: r.phone,
      total_points: Number(r.total_points)
    }));
  }

  SuccessResponse(res, { 
    leaderboard: leaderboardData
  }, 200);
};