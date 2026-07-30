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
            })
            .from(settings)
            .orderBy(desc(settings.createdAt)) // ترتيب الأحدث أولاً
            .limit(1);

        if (names.length > 0) {
            // حالة وجود بيانات سابقة: نقوم بالتحديث
            const { user, leader, admin } = req.body;
            const updateData: Record<string, any> = {};
            
            if (user !== undefined) updateData.user = user;
            if (leader !== undefined) updateData.leader = leader;
            if (admin !== undefined) updateData.admin = admin;

            // التأكد من وجود بيانات فعلية للتحديث لتجنب استعلام فارغ
            if (Object.keys(updateData).length > 0) {
                await db.update(settings)
                    .set(updateData)
                    .where(eq(settings.id, names[0].id)); // 🔴 تم إضافة شرط التحديد هنا
            }
            
            SuccessResponse(res, { message: "Settings updated successfully" }, 200);
        } else {
            // حالة عدم وجود بيانات سابقة: نقوم بالتحقق وإنشاء سجل جديد
            const validated = await createSettingsSchema.parseAsync({ body: req.body });
            const { user, leader, admin } = validated.body;
            
            await db.insert(settings)
                .values({
                    user,
                    leader,
                    admin
                });
            
            SuccessResponse(res, { message: "Settings created successfully" }, 201);
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