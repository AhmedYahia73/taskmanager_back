// src/controllers/admin/notifications.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { notifications } from "../../models/schema";
import { eq, desc, and, count } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { registerUserToken, getFirebaseAdmin } from "../../utils/firebase";

// ✅ Get Notifications for logged-in user with pagination
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 15));
    const offset = (page - 1) * limit;

    const [notifs, [totalResult], [unreadResult]] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(eq(notifications.user_id, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(notifications)
        .where(eq(notifications.user_id, userId)),
      db
        .select({ unreadCount: count() })
        .from(notifications)
        .where(and(eq(notifications.user_id, userId), eq(notifications.is_read, false)))
    ]);

    const total = totalResult?.total || 0;
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    SuccessResponse(
      res,
      {
        notifications: notifs,
        unreadCount: unreadResult?.unreadCount || 0,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasMore,
        },
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

// ✅ Register FCM Device Token for logged-in user and subscribe to Firebase Topics
export const registerFCMToken = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as string | undefined;
    const { token } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Valid token string is required in body" });
    }

    const success = await registerUserToken(userId, token, role);

    SuccessResponse(
      res,
      {
        message: success ? "FCM token registered and subscribed to topics successfully" : "FCM token registered",
        userId,
        token: token.trim(),
        subscribedTopics: [
          `user_${userId}`,
          ...(role === "admin" || role === "super_admin" ? ["admins"] : []),
          ...(role ? [role] : [])
        ]
      },
      200
    );
  } catch (error) {
    console.error("Error registering FCM token:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// 🧪 Test FCM Push Notification endpoint
export const testFCM = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { token, topic } = req.body;

    const fb = getFirebaseAdmin();
    if (!fb) {
      return res.status(500).json({
        success: false,
        message: "Firebase Admin is NOT initialized. Check project_id, client_email, and private_key in backend .env",
      });
    }

    const targetTopic = topic || (req.user?.role === "admin" || req.user?.role === "super_admin" ? "admins" : `user_${userId}`);
    let result: any = null;

    if (token) {
      result = await fb.messaging().send({
        token: String(token).trim(),
        notification: {
          title: "تجربة إشعار Firebase | Test Notification",
          body: "إذا وصلك هذا الإشعار، فالاتصال بـ Firebase يعمل 100%! 🚀",
        },
        data: {
          type: "test",
          link: "/admin",
        },
      });
    } else {
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
      });
    }

    SuccessResponse(
      res,
      {
        message: "Test notification sent successfully to Firebase!",
        target: token ? `token: ${String(token).substring(0, 15)}...` : `topic: ${targetTopic}`,
        firebaseMessageId: result,
      },
      200
    );
  } catch (error: any) {
    console.error("Test FCM error:", error);
    res.status(500).json({
      success: false,
      message: "Firebase error: " + (error?.message || String(error)),
      code: error?.code,
      details: error?.errorInfo || null,
    });
  }
};
