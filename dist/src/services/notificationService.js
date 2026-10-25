"use strict";
// src/services/notificationService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyUser = exports.notifyAdmins = void 0;
const db_1 = require("../models/db");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const socket_1 = require("../socket");
const uuid_1 = require("uuid");
/**
 * 📢 Notify ALL admins (admin, super_admin):
 * 1. Inserts persistent records in the `notifications` table for every admin.
 * 2. Emits real-time event to 'admins' socket room + dispatches Firebase FCM push.
 */
const notifyAdmins = async (payload) => {
    try {
        const adminUsers = await db_1.db
            .select({ id: schema_1.users.id })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.users.role, "admin"), (0, drizzle_orm_1.eq)(schema_1.users.role, "super_admin")));
        if (adminUsers.length > 0) {
            const records = adminUsers.map((adm) => ({
                id: (0, uuid_1.v4)(),
                user_id: adm.id,
                target: "admin",
                type: payload.type,
                link: payload.link || "/admin",
                description: payload.description,
                is_read: false,
            }));
            await db_1.db.insert(schema_1.notifications).values(records);
        }
        // 1. WebSocket / Socket.IO broadcast to 'admins' room + Firebase Push
        await (0, socket_1.sendNotificationToAdmins)({
            target: "admin",
            type: payload.type,
            link: payload.link || "/admin",
            description: payload.description,
            created_at: new Date().toISOString(),
            ...(payload.metadata || {}),
        });
    }
    catch (error) {
        console.error("Failed to notify admins:", error);
    }
};
exports.notifyAdmins = notifyAdmins;
/**
 * 👤 Notify a SPECIFIC user:
 * 1. Inserts a persistent record in the `notifications` table for this user.
 * 2. Emits real-time event to that user's socket room (`user_${userId}`) + dispatches Firebase FCM push.
 */
const notifyUser = async (userId, payload) => {
    if (!userId)
        return;
    try {
        const notifId = (0, uuid_1.v4)();
        await db_1.db.insert(schema_1.notifications).values({
            id: notifId,
            user_id: userId,
            target: "user",
            type: payload.type,
            link: payload.link || "/attendance",
            description: payload.description,
            is_read: false,
        });
        // 1. WebSocket / Socket.IO notification to user's room + Firebase Push
        await (0, socket_1.sendNotificationToUser)(userId, {
            id: notifId,
            user_id: userId,
            target: "user",
            type: payload.type,
            link: payload.link || "/attendance",
            description: payload.description,
            created_at: new Date().toISOString(),
            ...(payload.metadata || {}),
        });
    }
    catch (error) {
        console.error(`Failed to notify user ${userId}:`, error);
    }
};
exports.notifyUser = notifyUser;
