// src/controllers/Project/ProjectController.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { projects, users, tasks } from "../../models/schema"; 
import { SQL, and, eq, like, count, desc, sql, ne, lte } from 'drizzle-orm';
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

// ✅ Get All Projects Summary & Stats
export const index = async (req: Request, res: Response) => {
  // 1. حساب المهام المعلقة (التي ليست "approve")
  const [pendingTasksResult] = await db
    .select({ value: count() })
    .from(tasks)
    .where(ne(tasks.status, "approve"));

  // 2. حساب إجمالي المشاريع
  const [allProjectsResult] = await db
    .select({ value: count() })
    .from(projects);

  // 3. حساب المهام المتأخرة (تاريخ التسليم أصغر من أو يساوي الوقت الحالي)
  const [delayTasksResult] = await db
    .select({ value: count() })
    .from(tasks)
    .where(lte(tasks.delivery_date, sql`NOW()`)); // ⚠️ تأكد من اسم الحقل عندك (deliveryDate / delivery_date)

  // إرسال النتيجة
  SuccessResponse(res, { 
    pending_tasks: pendingTasksResult?.value ?? 0, 
    all_projects: allProjectsResult?.value ?? 0, 
    delay_tasks: delayTasksResult?.value ?? 0, 
  }, 200);
};

// ✅ Get All Projects Summary & Stats
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