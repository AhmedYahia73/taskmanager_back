// src/controllers/admin/userOnlineDays.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { users, notifications } from "../../models/schema";
import { inArray, ne } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { sendNotificationToUser } from "../../socket";
import { v4 as uuidv4 } from "uuid";

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
export const getUsersOnlineDays = async (req: Request, res: Response) => {
  try {
    const list = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        image: users.image,
        role: users.role,
        online_days: users.online_days,
      })
      .from(users)
      .where(ne(users.status, "inactive"))
      .orderBy(users.name);

    SuccessResponse(res, { users: list }, 200);
  } catch (error) {
    console.error("Error fetching users online days:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// 📌 PUT /api/admin/user-online-days
// Update online work days for one or more users & notify them in real-time
export const updateUsersOnlineDays = async (req: Request, res: Response) => {
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
    const normalizedDays = days.map((d: string) => String(d).trim().toLowerCase());
    const invalidDays = normalizedDays.filter((d: string) => !VALID_DAYS.includes(d));

    if (invalidDays.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid day(s): ${invalidDays.join(", ")}. Valid days: ${VALID_DAYS.join(", ")}`,
      });
    }

    // 1. Update online_days in users table for all selected users
    await db
      .update(users)
      .set({ online_days: normalizedDays })
      .where(inArray(users.id, userIds));

    // 2. Format notification message
    const dayNames = normalizedDays
      .map((d: string) => d.charAt(0).toUpperCase() + d.slice(1))
      .join(", ");

    const description =
      normalizedDays.length > 0
        ? `Admin has assigned your online work days to: ${dayNames}`
        : "Admin has removed your online work days";

    // 3. Insert notification records for all selected users
    const notifRecords = userIds.map((uid) => ({
      id: uuidv4(),
      user_id: uid,
      target: "user",
      type: "online_days",
      link: "/attendance",
      description,
      is_read: false,
    }));

    if (notifRecords.length > 0) {
      try {
        await db.insert(notifications).values(notifRecords);
      } catch (notifErr) {
        console.error("Failed to insert notifications into DB:", notifErr);
      }
    }

    // 4. Send Real-Time socket notifications ONLY to each assigned user (in their specific user_userId room)
    try {
      for (const notif of notifRecords) {
        sendNotificationToUser(notif.user_id, {
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
    } catch (sockErr) {
      console.error("Failed to send socket notification:", sockErr);
    }

    SuccessResponse(
      res,
      {
        message: "Online days updated and notifications sent successfully",
        updatedUsersCount: userIds.length,
        days: normalizedDays,
      },
      200
    );
  } catch (error) {
    console.error("Error updating user online days:", error);
    res.status(500).json({
      success: false,
      message: (error as any)?.message || "Internal Server Error",
    });
  }
};

export const updateUserOnlineDays = updateUsersOnlineDays;
