// src/controllers/admin/userOnlineDays.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { users } from "../../models/schema";
import { inArray, and, ne } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { notifyUser } from "../../services/notificationService";

const ALLOWED_ONLINE_ROLES = ["engineer", "leader_sales", "leader"];

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
// Get all eligible users (leader, engineer, leader_sales) with their assigned online days
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
      .where(
        and(
          ne(users.status, "inactive"),
          inArray(users.role, ALLOWED_ONLINE_ROLES as any)
        )
      )
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

    // Verify all selected users belong to eligible roles (leader, engineer, leader_sales)
    const targetUsers = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(inArray(users.id, userIds));

    const invalidUsers = targetUsers.filter(
      (u) => !ALLOWED_ONLINE_ROLES.includes(u.role as string)
    );

    if (invalidUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Online work days can only be assigned to leader, engineer, or leader_sales roles.",
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

    // 3. Send notifications to each assigned user (DB + Socket)
    for (const uid of userIds) {
      await notifyUser(uid, {
        type: "online_days",
        link: "/attendance",
        description,
        metadata: { days: normalizedDays },
      });
    }

    SuccessResponse(
      res,
      {
        message: `Online days updated and notifications sent successfully`,
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
