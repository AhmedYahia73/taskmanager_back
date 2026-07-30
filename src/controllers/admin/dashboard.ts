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

  SuccessResponse(res, { 
    pending_tasks: pendingTasksResult?.value ?? 0, 
    all_projects: allProjectsResult?.value ?? 0, 
    delay_tasks: delayTasksResult?.value ?? 0, 
    engineers_count: engineersResult?.value ?? 0,
    done_tasks: doneTasksResult?.value ?? 0,
    approve_tasks: approveTasksResult?.value ?? 0,
    total_tasks: totalTasksResult?.value ?? 0,
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