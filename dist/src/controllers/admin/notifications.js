"use strict";
// src/controllers/admin/notifications.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
// ✅ Get Notifications for logged-in admin
const getNotifications = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const limit = parseInt(req.query.limit) || 50;
        const notifs = await db_1.db
            .select()
            .from(schema_1.notifications)
            .where((0, drizzle_orm_1.eq)(schema_1.notifications.user_id, userId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.notifications.createdAt))
            .limit(limit);
        const [unreadResult] = await db_1.db
            .select({ unreadCount: (0, drizzle_orm_1.count)() })
            .from(schema_1.notifications)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notifications.user_id, userId), (0, drizzle_orm_1.eq)(schema_1.notifications.is_read, false)));
        (0, response_1.SuccessResponse)(res, {
            notifications: notifs,
            unreadCount: unreadResult?.unreadCount || 0,
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
