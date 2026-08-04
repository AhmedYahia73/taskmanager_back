"use strict";
// src/controllers/User/UserController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettings = exports.getSettings = exports.createSettingsSchema = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const zod_1 = require("zod");
// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
// الـ Schema الخاص بإنشاء إعدادات الأسماء (Settings)
exports.createSettingsSchema = zod_1.z.object({
    body: zod_1.z.object({
        user: zod_1.z.string({ required_error: "User Name is required" })
            .min(1, "User Name cannot be empty")
            .max(200, "User Name cannot exceed 200 characters"),
        leader: zod_1.z.string({ required_error: "Leader Name is required" })
            .min(1, "Leader Name cannot be empty")
            .max(200, "Leader Name cannot exceed 200 characters"),
        admin: zod_1.z.string({ required_error: "Admin Name is required" })
            .min(1, "Admin Name cannot be empty")
            .max(200, "Admin Name cannot exceed 200 characters"),
        task_approve_points: zod_1.z.coerce.number().optional(),
        task_edit_points: zod_1.z.coerce.number().optional(),
        task_delay_points: zod_1.z.coerce.number().optional(),
        online_days: zod_1.z.array(zod_1.z.string()).optional(),
        delay_premission_minutes: zod_1.z.coerce.number().optional(),
        yearly_holidays: zod_1.z.coerce.number().optional(),
    }),
});
// ✅ Get Settings
const getSettings = async (req, res) => {
    try {
        // بناء استعلام البيانات الأساسي
        const names = await db_1.db
            .select({
            id: schema_1.settings.id,
            user: schema_1.settings.user,
            leader: schema_1.settings.leader,
            admin: schema_1.settings.admin,
            task_approve_points: schema_1.settings.task_approve_points,
            task_edit_points: schema_1.settings.task_edit_points,
            task_delay_points: schema_1.settings.task_delay_points,
            online_days: schema_1.settings.online_days,
            delay_premission_minutes: schema_1.settings.delay_premission_minutes,
            yearly_holidays: schema_1.settings.yearly_holidays,
        })
            .from(schema_1.settings)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.settings.createdAt)) // ترتيب الأحدث أولاً
            .limit(1);
        // إرسال النتيجة
        (0, response_1.SuccessResponse)(res, {
            Names: names.length > 0 ? names[0] : null,
        }, 200);
    }
    catch (error) {
        console.error("Error fetching settings:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getSettings = getSettings;
// ✅ Update or Create Settings
const updateSettings = async (req, res) => {
    try {
        const names = await db_1.db
            .select({
            id: schema_1.settings.id,
            user: schema_1.settings.user,
            leader: schema_1.settings.leader,
            admin: schema_1.settings.admin,
            task_approve_points: schema_1.settings.task_approve_points,
            task_edit_points: schema_1.settings.task_edit_points,
            task_delay_points: schema_1.settings.task_delay_points,
            online_days: schema_1.settings.online_days,
            delay_premission_minutes: schema_1.settings.delay_premission_minutes,
            yearly_holidays: schema_1.settings.yearly_holidays,
        })
            .from(schema_1.settings)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.settings.createdAt)) // ترتيب الأحدث أولاً
            .limit(1);
        if (names.length > 0) {
            // حالة وجود بيانات سابقة: نقوم بالتحديث
            const { user, leader, admin, task_approve_points, task_edit_points, task_delay_points, online_days, delay_premission_minutes, yearly_holidays } = req.body;
            const updateData = {};
            if (user !== undefined)
                updateData.user = user;
            if (leader !== undefined)
                updateData.leader = leader;
            if (admin !== undefined)
                updateData.admin = admin;
            if (task_approve_points !== undefined)
                updateData.task_approve_points = task_approve_points;
            if (task_edit_points !== undefined)
                updateData.task_edit_points = task_edit_points;
            if (task_delay_points !== undefined)
                updateData.task_delay_points = task_delay_points;
            if (online_days !== undefined)
                updateData.online_days = online_days;
            if (delay_premission_minutes !== undefined)
                updateData.delay_premission_minutes = delay_premission_minutes;
            if (yearly_holidays !== undefined)
                updateData.yearly_holidays = yearly_holidays;
            // التأكد من وجود بيانات فعلية للتحديث لتجنب استعلام فارغ
            if (Object.keys(updateData).length > 0) {
                await db_1.db.update(schema_1.settings)
                    .set(updateData)
                    .where((0, drizzle_orm_1.eq)(schema_1.settings.id, names[0].id)); // 🔴 تم إضافة شرط التحديد هنا
            }
            (0, response_1.SuccessResponse)(res, { message: "Settings updated successfully" }, 200);
        }
        else {
            // حالة عدم وجود بيانات سابقة: نقوم بالتحقق وإنشاء سجل جديد
            const validated = await exports.createSettingsSchema.parseAsync({ body: req.body });
            const { user, leader, admin, task_approve_points, task_edit_points, task_delay_points, online_days, delay_premission_minutes, yearly_holidays } = validated.body;
            await db_1.db.insert(schema_1.settings)
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
            (0, response_1.SuccessResponse)(res, { message: "Settings created successfully" }, 201);
        }
    }
    catch (error) {
        // التقاط أخطاء التحقق الخاصة بـ Zod
        if (error instanceof zod_1.z.ZodError) {
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
exports.updateSettings = updateSettings;
