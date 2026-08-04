// src/controllers/User/UserController.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { settings } from "../../models/schema"; 
import { eq, desc } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";
// يفترض أن لديك ملف للتعامل مع الأخطاء (Error Handling)
import { BadRequest } from "../../Errors/BadRequest"; 
import { z } from "zod";

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================

// الـ Schema الخاص بإنشاء إعدادات الأسماء (Settings)
export const createSettingsSchema = z.object({
  body: z.object({
    user: z.string({ required_error: "User Name is required" })
      .min(1, "User Name cannot be empty")
      .max(200, "User Name cannot exceed 200 characters"),

    leader: z.string({ required_error: "Leader Name is required" })
      .min(1, "Leader Name cannot be empty")
      .max(200, "Leader Name cannot exceed 200 characters"),

    admin: z.string({ required_error: "Admin Name is required" })
      .min(1, "Admin Name cannot be empty")
      .max(200, "Admin Name cannot exceed 200 characters"),

    task_approve_points: z.coerce.number().optional(),
    task_edit_points: z.coerce.number().optional(),
    task_delay_points: z.coerce.number().optional(),
    online_days: z.array(z.string()).optional(),
    delay_premission_minutes: z.coerce.number().optional(),
    yearly_holidays: z.coerce.number().optional(),
  }),
});  

// ✅ Get Settings
export const getSettings = async (req: Request, res: Response) => {
    try {
        // بناء استعلام البيانات الأساسي
        const names = await db
            .select({
                id: settings.id,
                user: settings.user,
                leader: settings.leader,
                admin: settings.admin,
                task_approve_points: settings.task_approve_points,
                task_edit_points: settings.task_edit_points,
                task_delay_points: settings.task_delay_points,
                online_days: settings.online_days,
                delay_premission_minutes: settings.delay_premission_minutes,
                yearly_holidays: settings.yearly_holidays,
            })
            .from(settings)
            .orderBy(desc(settings.createdAt)) // ترتيب الأحدث أولاً
            .limit(1);
       
        // إرسال النتيجة
        SuccessResponse(res, { 
            Names: names.length > 0 ? names[0] : null,
        }, 200);

    } catch (error) {
        console.error("Error fetching settings:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}; 
  
// ✅ Update or Create Settings
export const updateSettings = async (req: Request, res: Response) => {
    try {
        const names = await db
            .select({
                id: settings.id,
                user: settings.user,
                leader: settings.leader,
                admin: settings.admin,
                task_approve_points: settings.task_approve_points,
                task_edit_points: settings.task_edit_points,
                task_delay_points: settings.task_delay_points,
                online_days: settings.online_days,
                delay_premission_minutes: settings.delay_premission_minutes,
                yearly_holidays: settings.yearly_holidays,
            })
            .from(settings)
            .orderBy(desc(settings.createdAt)) // ترتيب الأحدث أولاً
            .limit(1);

        if (names.length > 0) {
            // حالة وجود بيانات سابقة: نقوم بالتحديث
            const { user, leader, admin, task_approve_points, task_edit_points, task_delay_points, online_days, delay_premission_minutes, yearly_holidays } = req.body;
            const updateData: Record<string, any> = {};
            
            if (user !== undefined) updateData.user = user;
            if (leader !== undefined) updateData.leader = leader;
            if (admin !== undefined) updateData.admin = admin;
            if (task_approve_points !== undefined) updateData.task_approve_points = task_approve_points;
            if (task_edit_points !== undefined) updateData.task_edit_points = task_edit_points;
            if (task_delay_points !== undefined) updateData.task_delay_points = task_delay_points;
            if (online_days !== undefined) updateData.online_days = online_days;
            if (delay_premission_minutes !== undefined) updateData.delay_premission_minutes = delay_premission_minutes;
            if (yearly_holidays !== undefined) updateData.yearly_holidays = yearly_holidays;

            // التأكد من وجود بيانات فعلية للتحديث لتجنب استعلام فارغ
            if (Object.keys(updateData).length > 0) {
                await db.update(settings)
                    .set(updateData)
                    .where(eq(settings.id, names[0].id)); // 🔴 تم إضافة شرط التحديد هنا
            }
            
            // جلب البيانات بعد التحديث لإرجاعها للواجهة
            const updatedNames = await db
                .select({
                    id: settings.id,
                    user: settings.user,
                    leader: settings.leader,
                    admin: settings.admin,
                    task_approve_points: settings.task_approve_points,
                    task_edit_points: settings.task_edit_points,
                    task_delay_points: settings.task_delay_points,
                    online_days: settings.online_days,
                    delay_premission_minutes: settings.delay_premission_minutes,
                    yearly_holidays: settings.yearly_holidays,
                })
                .from(settings)
                .where(eq(settings.id, names[0].id))
                .limit(1);

            SuccessResponse(res, { message: "Settings updated successfully", Names: updatedNames[0] }, 200);
        } else {
            // حالة عدم وجود بيانات سابقة: نقوم بالتحقق وإنشاء سجل جديد
            const validated = await createSettingsSchema.parseAsync({ body: req.body });
            const { user, leader, admin, task_approve_points, task_edit_points, task_delay_points, online_days, delay_premission_minutes, yearly_holidays } = validated.body;
            
            await db.insert(settings)
                .values({
                    user,
                    leader,
                    admin,
                    task_approve_points,
                    task_edit_points,
                    task_delay_points,
                    online_days,
                    delay_premission_minutes,
                    yearly_holidays,
                });
                
            const createdNames = await db
                .select({
                    id: settings.id,
                    user: settings.user,
                    leader: settings.leader,
                    admin: settings.admin,
                    task_approve_points: settings.task_approve_points,
                    task_edit_points: settings.task_edit_points,
                    task_delay_points: settings.task_delay_points,
                    online_days: settings.online_days,
                    delay_premission_minutes: settings.delay_premission_minutes,
                    yearly_holidays: settings.yearly_holidays,
                })
                .from(settings)
                .orderBy(desc(settings.createdAt))
                .limit(1);
            
            SuccessResponse(res, { message: "Settings created successfully", Names: createdNames[0] }, 201);
        }

    } catch (error) {
        // التقاط أخطاء التحقق الخاصة بـ Zod
        if (error instanceof z.ZodError) {
            // استخدام BadRequest إذا كانت متوفرة لديك للتعامل مع أخطاء 400
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: error.errors
            });
        }
        
        console.error("Error updating settings:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};