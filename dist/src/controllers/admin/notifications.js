"use strict";
// src/controllers/admin/notifications.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.testFCM = exports.registerFCMToken = exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const firebase_1 = require("../../utils/firebase");
// ✅ Get Notifications for logged-in user with pagination
const getNotifications = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 15));
        const offset = (page - 1) * limit;
        const [notifs, [totalResult], [unreadResult]] = await Promise.all([
            db_1.db
                .select()
                .from(schema_1.notifications)
                .where((0, drizzle_orm_1.eq)(schema_1.notifications.user_id, userId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.notifications.createdAt))
                .limit(limit)
                .offset(offset),
            db_1.db
                .select({ total: (0, drizzle_orm_1.count)() })
                .from(schema_1.notifications)
                .where((0, drizzle_orm_1.eq)(schema_1.notifications.user_id, userId)),
            db_1.db
                .select({ unreadCount: (0, drizzle_orm_1.count)() })
                .from(schema_1.notifications)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notifications.user_id, userId), (0, drizzle_orm_1.eq)(schema_1.notifications.is_read, false)))
        ]);
        const total = totalResult?.total || 0;
        const totalPages = Math.ceil(total / limit);
        const hasMore = page < totalPages;
        (0, response_1.SuccessResponse)(res, {
            notifications: notifs,
            unreadCount: unreadResult?.unreadCount || 0,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasMore,
            },
        }, 200);
    }
    catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getNotifications = getNotifications;
// ✅ Mark a single notification as read
const markAsRead = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        await db_1.db
            .update(schema_1.notifications)
            .set({ is_read: true })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notifications.id, id), (0, drizzle_orm_1.eq)(schema_1.notifications.user_id, userId)));
        (0, response_1.SuccessResponse)(res, { message: "Notification marked as read" }, 200);
    }
    catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.markAsRead = markAsRead;
// ✅ Mark all notifications as read
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        await db_1.db
            .update(schema_1.notifications)
            .set({ is_read: true })
            .where((0, drizzle_orm_1.eq)(schema_1.notifications.user_id, userId));
        (0, response_1.SuccessResponse)(res, { message: "All notifications marked as read" }, 200);
    }
    catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.markAllAsRead = markAllAsRead;
// ✅ Delete notification
const deleteNotification = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        await db_1.db
            .delete(schema_1.notifications)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notifications.id, id), (0, drizzle_orm_1.eq)(schema_1.notifications.user_id, userId)));
        (0, response_1.SuccessResponse)(res, { message: "Notification deleted successfully" }, 200);
    }
    catch (error) {
        console.error("Error deleting notification:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.deleteNotification = deleteNotification;
// ✅ Register FCM Device Token for logged-in user and subscribe to Firebase Topics
const registerFCMToken = async (req, res) => {
    try {
        const userId = req.user?.id;
        const role = req.user?.role;
        const { token } = req.body;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        if (!token || typeof token !== "string" || token.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Valid token string is required in body" });
        }
        const success = await (0, firebase_1.registerUserToken)(userId, token, role);
        (0, response_1.SuccessResponse)(res, {
            message: success ? "FCM token registered and subscribed to topics successfully" : "FCM token registered",
            userId,
            token: token.trim(),
            subscribedTopics: [
                `user_${userId}`,
                ...(role === "admin" || role === "super_admin" ? ["admins"] : []),
                ...(role ? [role] : [])
            ]
        }, 200);
    }
    catch (error) {
        console.error("Error registering FCM token:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.registerFCMToken = registerFCMToken;
// 🧪 Test FCM Push Notification endpoint
const testFCM = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { token, topic } = req.body;
        const fb = (0, firebase_1.getFirebaseAdmin)();
        if (!fb) {
            return res.status(500).json({
                success: false,
                message: "Firebase Admin is NOT initialized. Check project_id, client_email, and private_key in backend .env",
            });
        }
        const targetTopic = topic || (req.user?.role === "admin" || req.user?.role === "super_admin" ? "admins" : `user_${userId}`);
        let result = null;
        // Direct token target
        const directToken = token ? String(token).trim() : (userId ? (0, firebase_1.getUserTokens)([userId])[0] : null);
        if (directToken) {
            result = await fb.messaging().send({
                token: directToken,
                notification: {
                    title: "تجربة إشعار Firebase | Test Notification",
                    body: "إذا وصلك هذا الإشعار، فالاتصال بـ Firebase يعمل 100%! 🚀",
                },
                data: {
                    type: "test",
                    link: "/admin",
                },
                webpush: {
                    headers: {
                        Urgency: "high",
                    },
                    notification: {
                        title: "تجربة إشعار Firebase | Test Notification",
                        body: "إذا وصلك هذا الإشعار، فالاتصال بـ Firebase يعمل 100%! 🚀",
                        icon: "/logo.png",
                        badge: "/favicon.svg",
                        requireInteraction: true,
                    },
                    fcmOptions: {
                        link: "/admin",
                    },
                },
            });
        }
        else {
            result = await fb.messaging().send({
                topic: targetTopic,
                notification: {
                    title: "تجربة إشعار Firebase | Test Notification",
                    body: `إشعار تجريبي عبر القناة: ${targetTopic} 🚀`,
                },
                data: {
                    type: "test",
                    link: "/admin",
                },
                webpush: {
                    headers: {
                        Urgency: "high",
                    },
                    notification: {
                        title: "تجربة إشعار Firebase | Test Notification",
                        body: `إشعار تجريبي عبر القناة: ${targetTopic} 🚀`,
                        icon: "/logo.png",
                        badge: "/favicon.svg",
                        requireInteraction: true,
                    },
                    fcmOptions: {
                        link: "/admin",
                    },
                },
            });
        }
        (0, response_1.SuccessResponse)(res, {
            message: "Test notification sent successfully to Firebase!",
            target: directToken ? `token: ${directToken.substring(0, 15)}...` : `topic: ${targetTopic}`,
            firebaseMessageId: result,
        }, 200);
    }
    catch (error) {
        console.error("Test FCM error:", error);
        res.status(500).json({
            success: false,
            message: "Firebase error: " + (error?.message || String(error)),
            code: error?.code,
            details: error?.errorInfo || null,
        });
    }
};
exports.testFCM = testFCM;
