"use strict";
// src/controllers/admin/userOnlineDays.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserOnlineDays = exports.updateUsersOnlineDays = exports.getUsersOnlineDays = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const notificationService_1 = require("../../services/notificationService");
const ALLOWED_ONLINE_ROLES = ["engineer", "leader_sales", "leader"];
const VALID_DAYS = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
];
// 📌 GET /api/admin/user-online-days
// Get all eligible users (leader, engineer, leader_sales) with their assigned online days
const getUsersOnlineDays = async (req, res) => {
    try {
        const list = await db_1.db
            .select({
            id: schema_1.users.id,
            name: schema_1.users.name,
            email: schema_1.users.email,
            phone: schema_1.users.phone,
            image: schema_1.users.image,
            role: schema_1.users.role,
            online_days: schema_1.users.online_days,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.ne)(schema_1.users.status, "inactive"), (0, drizzle_orm_1.inArray)(schema_1.users.role, ALLOWED_ONLINE_ROLES)))
            .orderBy(schema_1.users.name);
        (0, response_1.SuccessResponse)(res, { users: list }, 200);
    }
    catch (error) {
        console.error("Error fetching users online days:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getUsersOnlineDays = getUsersOnlineDays;
// 📌 PUT /api/admin/user-online-days
// Update online work days for one or more users & notify them in real-time
const updateUsersOnlineDays = async (req, res) => {
    try {
        const { userIds, days } = req.body;
        // Validation
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "userIds must be a non-empty array of user UUIDs",
            });
        }
        if (!days || !Array.isArray(days)) {
            return res.status(400).json({
                success: false,
                message: "days must be an array of day names (e.g. ['monday', 'thursday'])",
            });
        }
        // Verify all selected users belong to eligible roles (leader, engineer, leader_sales)
        const targetUsers = await db_1.db
            .select({ id: schema_1.users.id, role: schema_1.users.role })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.inArray)(schema_1.users.id, userIds));
        const invalidUsers = targetUsers.filter((u) => !ALLOWED_ONLINE_ROLES.includes(u.role));
        if (invalidUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Online work days can only be assigned to leader, engineer, or leader_sales roles.",
            });
        }
        // Normalize and validate days
        const normalizedDays = days.map((d) => String(d).trim().toLowerCase());
        const invalidDays = normalizedDays.filter((d) => !VALID_DAYS.includes(d));
        if (invalidDays.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Invalid day(s): ${invalidDays.join(", ")}. Valid days: ${VALID_DAYS.join(", ")}`,
            });
        }
        // 1. Update online_days in users table for all selected users
        await db_1.db
            .update(schema_1.users)
            .set({ online_days: normalizedDays })
            .where((0, drizzle_orm_1.inArray)(schema_1.users.id, userIds));
        // 2. Format notification message
        const dayNames = normalizedDays
            .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
            .join(", ");
        const description = normalizedDays.length > 0
            ? `Admin has assigned your online work days to: ${dayNames}`
            : "Admin has removed your online work days";
        // 3. Send notifications to each assigned user (DB + Socket)
        for (const uid of userIds) {
            await (0, notificationService_1.notifyUser)(uid, {
                type: "online_days",
                link: "/attendance",
                description,
                metadata: { days: normalizedDays },
            });
        }
        (0, response_1.SuccessResponse)(res, {
            message: `Online days updated and notifications sent successfully`,
            updatedUsersCount: userIds.length,
            days: normalizedDays,
        }, 200);
    }
    catch (error) {
        console.error("Error updating user online days:", error);
        res.status(500).json({
            success: false,
            message: error?.message || "Internal Server Error",
        });
    }
};
exports.updateUsersOnlineDays = updateUsersOnlineDays;
exports.updateUserOnlineDays = exports.updateUsersOnlineDays;
