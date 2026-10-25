"use strict";
// src/controllers/admin/userOnlineDays.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUsersOnlineDays = exports.getUsersOnlineDays = exports.updateUsersOnlineDaysSchema = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const socket_1 = require("../../socket");
const zod_1 = require("zod");
exports.updateUsersOnlineDaysSchema = zod_1.z.object({
    body: zod_1.z.object({
        userIds: zod_1.z.array(zod_1.z.string()).min(1, "At least one user must be selected"),
        days: zod_1.z.array(zod_1.z.string()),
    }),
});
// ✅ Get all users with their assigned online days
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
// ✅ Update online days for selected users and notify them in real-time
const updateUsersOnlineDays = async (req, res) => {
    try {
        const validated = await exports.updateUsersOnlineDaysSchema.parseAsync({ body: req.body });
        const { userIds, days } = validated.body;
        // 1. Update online_days in the users table
        await db_1.db
            .update(schema_1.users)
            .set({ online_days: days })
            .where((0, drizzle_orm_1.inArray)(schema_1.users.id, userIds));
        // 2. Prepare readable days list and notification text
        const dayNames = days.length > 0
            ? days
                .map((d) => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase())
                .join(", ")
            : "None (Removed)";
        const description = days.length > 0
            ? `Admin has assigned your online work days to: ${dayNames}`
            : "Admin has removed your online work days";
        // 3. Insert notification records for all selected users
        const notifRecords = userIds.map((uid) => ({
            user_id: uid,
            target: "user",
            type: "online_days",
            link: "/attendance",
            description,
            is_read: false,
        }));
        if (notifRecords.length > 0) {
            await db_1.db.insert(schema_1.notifications).values(notifRecords);
        }
        // 4. Send Real-Time socket notifications to each user
        for (const uid of userIds) {
            (0, socket_1.sendNotificationToUser)(uid, {
                target: "user",
                type: "online_days",
                link: "/attendance",
                description,
                days,
                created_at: new Date().toISOString(),
            });
        }
        // 5. Also alert admins
        (0, socket_1.sendNotificationToAdmins)({
            description: `Online days updated for ${userIds.length} user(s): ${dayNames}`,
            created_at: new Date().toISOString(),
        });
        (0, response_1.SuccessResponse)(res, {
            message: "Online days updated and notifications sent successfully",
            updatedUsersCount: userIds.length,
            days,
        }, 200);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: error.errors,
            });
        }
        console.error("Error updating users online days:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.updateUsersOnlineDays = updateUsersOnlineDays;
