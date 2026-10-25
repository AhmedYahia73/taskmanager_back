// src/controllers/admin/notifications.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { notifications } from "../../models/schema";
import { eq, desc, and, count } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";

// ✅ Get Notifications for logged-in admin
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const limit = parseInt(req.query.limit as string) || 50;

    const notifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.user_id, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    const [unreadResult] = await db
      .select({ unreadCount: count() })
      .from(notifications)
      .where(and(eq(notifications.user_id, userId), eq(notifications.is_read, false)));

    SuccessResponse(
      res,
      {
        notifications: notifs,
        unreadCount: unreadResult?.unreadCount || 0,
      },
      200
    );
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ✅ Mark a single notification as read
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    await db
      .update(notifications)
      .set({ is_read: true })
      .where(and(eq(notifications.id, id), eq(notifications.user_id, userId)));

    SuccessResponse(res, { message: "Notification marked as read" }, 200);
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ✅ Mark all notifications as read
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    await db
      .update(notifications)
      .set({ is_read: true })
      .where(eq(notifications.user_id, userId));

    SuccessResponse(res, { message: "All notifications marked as read" }, 200);
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ✅ Delete notification
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    await db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.user_id, userId)));

    SuccessResponse(res, { message: "Notification deleted successfully" }, 200);
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
