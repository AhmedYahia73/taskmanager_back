// src/controllers/admin/userOnlineDays.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { users, notifications } from "../../models/schema";
import { inArray, ne } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { sendNotificationToUser, sendNotificationToAdmins } from "../../socket";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

export const updateUsersOnlineDaysSchema = z.object({
  body: z.object({
    userIds: z.array(z.string()).min(1, "At least one user must be selected"),
    days: z.array(z.string()),
  }),
});

// ✅ Get all users with their assigned online days
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

// ✅ Update online days for selected users and notify them in real-time
export const updateUsersOnlineDays = async (req: Request, res: Response) => {
  try {
    const validated = await updateUsersOnlineDaysSchema.parseAsync({ body: req.body });
    const { userIds, days } = validated.body;

    // 1. Update online_days in the users table
    await db
      .update(users)
      .set({ online_days: days })
      .where(inArray(users.id, userIds));

    // 2. Prepare readable days list and notification text
    const dayNames =
      days.length > 0
        ? days
            .map((d: string) => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase())
            .join(", ")
        : "None (Removed)";

    const description =
      days.length > 0
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
        console.error("Failed to insert notifications:", notifErr);
      }
    }

    // 4. Send Real-Time socket notifications to each user
    try {
      for (const uid of userIds) {
        sendNotificationToUser(uid, {
          id: uuidv4(),
          target: "user",
          type: "online_days",
          link: "/attendance",
          description,
          days,
          created_at: new Date().toISOString(),
        });
      }

      // 5. Also alert admins
      sendNotificationToAdmins({
        target: "admin",
        type: "online_days",
        description: `Online days updated for ${userIds.length} user(s): ${dayNames}`,
        created_at: new Date().toISOString(),
      });
    } catch (sockErr) {
      console.error("Failed to send socket notification:", sockErr);
    }

    SuccessResponse(
      res,
      {
        message: "Online days updated and notifications sent successfully",
        updatedUsersCount: userIds.length,
        days,
      },
      200
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors,
      });
    }

    console.error("Error updating users online days:", error);
    res.status(500).json({ 
      success: false, 
      message: (error as any)?.message || "Internal Server Error" 
    });
  }
};
