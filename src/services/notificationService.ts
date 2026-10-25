// src/services/notificationService.ts

import { db } from "../models/db";
import { notifications, users } from "../models/schema";
import { or, eq } from "drizzle-orm";
import { sendNotificationToAdmins, sendNotificationToUser } from "../socket";
import { v4 as uuidv4 } from "uuid";

export interface NotificationPayload {
  type: string;
  description: string;
  link?: string;
  metadata?: any;
}

/**
 * 📢 Notify ALL admins (admin, super_admin):
 * 1. Inserts persistent records in the `notifications` table for every admin.
 * 2. Emits real-time event to 'admins' socket room + dispatches Firebase FCM push.
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

    // 1. WebSocket / Socket.IO broadcast to 'admins' room + Firebase Push
    await sendNotificationToAdmins({
      target: "admin",
      type: payload.type,
      link: payload.link || "/admin",
      description: payload.description,
      created_at: new Date().toISOString(),
      ...(payload.metadata || {}),
    });
  } catch (error) {
    console.error("Failed to notify admins:", error);
  }
};

/**
 * 👤 Notify a SPECIFIC user:
 * 1. Inserts a persistent record in the `notifications` table for this user.
 * 2. Emits real-time event to that user's socket room (`user_${userId}`) + dispatches Firebase FCM push.
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

    // 1. WebSocket / Socket.IO notification to user's room + Firebase Push
    await sendNotificationToUser(userId, {
      id: notifId,
      user_id: userId,
      target: "user",
      type: payload.type,
      link: payload.link || "/attendance",
      description: payload.description,
      created_at: new Date().toISOString(),
      ...(payload.metadata || {}),
    });
  } catch (error) {
    console.error(`Failed to notify user ${userId}:`, error);
  }
};
