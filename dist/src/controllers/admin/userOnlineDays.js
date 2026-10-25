"use strict";
// src/controllers/admin/userOnlineDays.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserOnlineDays = exports.updateUsersOnlineDays = exports.getUsersOnlineDays = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const socket_1 = require("../../socket");
const uuid_1 = require("uuid");
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
// Get all users with their assigned online days
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
            .where((0, drizzle_orm_1.ne)(schema_1.users.status, "inactive"))
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
        // 3. Insert notification records for all selected users
        const notifRecords = userIds.map((uid) => ({
            id: (0, uuid_1.v4)(),
            user_id: uid,
            target: "user",
            type: "online_days",
            link: "/attendance",
            description,
            is_read: false,
        }));
        if (notifRecords.length > 0) {
            try {
                await db_1.db.insert(schema_1.notifications).values(notifRecords);
            }
            catch (notifErr) {
                console.error("Failed to insert notifications into DB:", notifErr);
            }
        }
        // 4. Send Real-Time socket notifications ONLY to each assigned user (in their specific user_userId room)
        try {
            for (const notif of notifRecords) {
                (0, socket_1.sendNotificationToUser)(notif.user_id, {
                    id: notif.id,
                    user_id: notif.user_id,
                    target: "user",
                    type: "online_days",
                    link: notif.link,
                    description: notif.description,
                    days: normalizedDays,
                    created_at: new Date().toISOString(),
                });
            }
        }
        catch (sockErr) {
            console.error("Failed to send socket notification:", sockErr);
        }
        (0, response_1.SuccessResponse)(res, {
            message: "Online days updated and notifications sent successfully",
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
