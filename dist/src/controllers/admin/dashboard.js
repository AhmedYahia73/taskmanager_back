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
// ✅ Get All Projects Summary & Stats
const index = async (req, res) => {
    // 1. حساب المهام المعلقة (التي ليست "approve")
    const [pendingTasksResult] = await db_1.db
        .select({ value: (0, drizzle_orm_1.count)() })
        .from(schema_1.tasks)
        .where((0, drizzle_orm_1.ne)(schema_1.tasks.status, "approve"));
    // 2. حساب إجمالي المشاريع
    const [allProjectsResult] = await db_1.db
        .select({ value: (0, drizzle_orm_1.count)() })
        .from(schema_1.projects);
    // 3. حساب المهام المتأخرة (تاريخ التسليم أصغر من أو يساوي الوقت الحالي)
    const [delayTasksResult] = await db_1.db
        .select({ value: (0, drizzle_orm_1.count)() })
        .from(schema_1.tasks)
        .where((0, drizzle_orm_1.lte)(schema_1.tasks.delivery_date, (0, drizzle_orm_1.sql) `NOW()`)); // ⚠️ تأكد من اسم الحقل عندك (deliveryDate / delivery_date)
    // إرسال النتيجة
    (0, response_1.SuccessResponse)(res, {
        pending_tasks: pendingTasksResult?.value ?? 0,
        all_projects: allProjectsResult?.value ?? 0,
        delay_tasks: delayTasksResult?.value ?? 0,
    }, 200);
};
exports.index = index;
// ✅ Get All Projects Summary & Stats
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
