"use strict";
// src/services/notificationService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyUser = exports.notifyAdmins = void 0;
const db_1 = require("../models/db");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const socket_1 = require("../socket");
const firebase_1 = require("../utils/firebase");
const uuid_1 = require("uuid");
const getNotificationTitle = (type) => {
    switch (type) {
        case "task_status":
            return "تحديث حالة المهمة | Task Status";
        case "online_days":
            return "أيام العمل أونلاين | Online Work Days";
        case "extra_time_request":
            return "طلب وقت إضافي | Extra Time Request";
        case "holiday_request":
            return "طلب إجازة | Leave Request";
        case "permission_request":
            return "طلب إذن | Permission Request";
        default:
            return "إشعار جديد | New Notification";
    }
};
/**
 * 📢 Notify ALL admins (admin, super_admin):
 * 1. Inserts persistent records in the `notifications` table for every admin.
 * 2. Emits a real-time event to the 'admins' socket room.
 * 3. Sends Firebase Cloud Messaging (FCM) Push Notifications to 'admins' topic + tokens.
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
        // 1. WebSocket / Socket.IO broadcast to 'admins' room
        (0, socket_1.sendNotificationToAdmins)({
            target: "admin",
            type: payload.type,
            link: payload.link || "/admin",
            description: payload.description,
            created_at: new Date().toISOString(),
            ...(payload.metadata || {}),
        });
        // 2. Firebase Push Notification to 'admins' topic
        const title = getNotificationTitle(payload.type);
        (0, firebase_1.sendTopicNotification)("admins", title, payload.description, {
            target: "admin",
            type: payload.type,
            link: payload.link || "/admin",
            ...(payload.metadata ? { metadata: JSON.stringify(payload.metadata) } : {}),
        }).catch((e) => console.error("[FCM] Admin topic push error:", e));
        // 3. Direct Multicast Push to registered Admin FCM tokens
        if (adminUsers.length > 0) {
            const adminTokens = (0, firebase_1.getUserTokens)(adminUsers.map((a) => a.id));
            if (adminTokens.length > 0) {
                (0, firebase_1.sendPushNotification)(adminTokens, title, payload.description, {
                    target: "admin",
                    type: payload.type,
                    link: payload.link || "/admin",
                }).catch((e) => console.error("[FCM] Admin tokens push error:", e));
            }
        }
    }
    catch (error) {
        console.error("Failed to notify admins:", error);
    }
};
exports.notifyAdmins = notifyAdmins;
/**
 * 👤 Notify a SPECIFIC user:
 * 1. Inserts a persistent record in the `notifications` table for this user.
 * 2. Emits a real-time event to that user's socket room (`user_${userId}`).
 * 3. Sends Firebase Cloud Messaging (FCM) Push Notification to user's topic + tokens.
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
        // 1. WebSocket / Socket.IO notification to user's room
        (0, socket_1.sendNotificationToUser)(userId, {
            id: notifId,
            user_id: userId,
            target: "user",
            type: payload.type,
            link: payload.link || "/attendance",
            description: payload.description,
            created_at: new Date().toISOString(),
            ...(payload.metadata || {}),
        });
        // 2. Firebase Push Notification to user's personal topic
        const title = getNotificationTitle(payload.type);
        (0, firebase_1.sendTopicNotification)(`user_${userId}`, title, payload.description, {
            id: notifId,
            target: "user",
            type: payload.type,
            link: payload.link || "/attendance",
            ...(payload.metadata ? { metadata: JSON.stringify(payload.metadata) } : {}),
        }).catch((e) => console.error("[FCM] User topic push error:", e));
        // 3. Direct Push to registered User FCM tokens
        const userTokens = (0, firebase_1.getUserTokens)([userId]);
        if (userTokens.length > 0) {
            (0, firebase_1.sendPushNotification)(userTokens, title, payload.description, {
                id: notifId,
                target: "user",
                type: payload.type,
                link: payload.link || "/attendance",
            }).catch((e) => console.error("[FCM] User tokens push error:", e));
        }
    }
    catch (error) {
        console.error(`Failed to notify user ${userId}:`, error);
    }
};
exports.notifyUser = notifyUser;
