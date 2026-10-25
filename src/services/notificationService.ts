// src/services/notificationService.ts

import { db } from "../models/db";
import { notifications, users } from "../models/schema";
import { or, eq } from "drizzle-orm";
import { sendNotificationToAdmins, sendNotificationToUser } from "../socket";
import { sendTopicNotification, sendPushNotification, getUserTokens } from "../utils/firebase";
import { v4 as uuidv4 } from "uuid";

export interface NotificationPayload {
  type: string;
  description: string;
  link?: string;
  metadata?: any;
}

const getNotificationTitle = (type: string): string => {
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
export const notifyAdmins = async (payload: NotificationPayload) => {
  try {
    const adminUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.role, "admin"), eq(users.role, "super_admin")));

    if (adminUsers.length > 0) {
      const records = adminUsers.map((adm) => ({
        id: uuidv4(),
        user_id: adm.id,
        target: "admin",
        type: payload.type,
        link: payload.link || "/admin",
        description: payload.description,
        is_read: false,
      }));

      await db.insert(notifications).values(records);
    }

    // 1. WebSocket / Socket.IO broadcast to 'admins' room
    sendNotificationToAdmins({
      target: "admin",
      type: payload.type,
      link: payload.link || "/admin",
      description: payload.description,
      created_at: new Date().toISOString(),
      ...(payload.metadata || {}),
    });

    // 2. Firebase Push Notification to 'admins' topic
    const title = getNotificationTitle(payload.type);
    sendTopicNotification("admins", title, payload.description, {
      target: "admin",
      type: payload.type,
      link: payload.link || "/admin",
      ...(payload.metadata ? { metadata: JSON.stringify(payload.metadata) } : {}),
    }).catch((e) => console.error("[FCM] Admin topic push error:", e));

    // 3. Direct Multicast Push to registered Admin FCM tokens
    if (adminUsers.length > 0) {
      const adminTokens = getUserTokens(adminUsers.map((a) => a.id));
      if (adminTokens.length > 0) {
        sendPushNotification(adminTokens, title, payload.description, {
          target: "admin",
          type: payload.type,
          link: payload.link || "/admin",
        }).catch((e) => console.error("[FCM] Admin tokens push error:", e));
      }
    }
  } catch (error) {
    console.error("Failed to notify admins:", error);
  }
};

/**
 * 👤 Notify a SPECIFIC user:
 * 1. Inserts a persistent record in the `notifications` table for this user.
 * 2. Emits a real-time event to that user's socket room (`user_${userId}`).
 * 3. Sends Firebase Cloud Messaging (FCM) Push Notification to user's topic + tokens.
 */
export const notifyUser = async (userId: string, payload: NotificationPayload) => {
  if (!userId) return;

  try {
    const notifId = uuidv4();
    await db.insert(notifications).values({
      id: notifId,
      user_id: userId,
      target: "user",
      type: payload.type,
      link: payload.link || "/attendance",
      description: payload.description,
      is_read: false,
    });

    // 1. WebSocket / Socket.IO notification to user's room
    sendNotificationToUser(userId, {
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
    sendTopicNotification(`user_${userId}`, title, payload.description, {
      id: notifId,
      target: "user",
      type: payload.type,
      link: payload.link || "/attendance",
      ...(payload.metadata ? { metadata: JSON.stringify(payload.metadata) } : {}),
    }).catch((e) => console.error("[FCM] User topic push error:", e));

    // 3. Direct Push to registered User FCM tokens
    const userTokens = getUserTokens([userId]);
    if (userTokens.length > 0) {
      sendPushNotification(userTokens, title, payload.description, {
        id: notifId,
        target: "user",
        type: payload.type,
        link: payload.link || "/attendance",
      }).catch((e) => console.error("[FCM] User tokens push error:", e));
    }
  } catch (error) {
    console.error(`Failed to notify user ${userId}:`, error);
  }
};
