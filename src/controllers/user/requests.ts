import { Request, Response } from "express";
import { db } from "../../models/db";
import { holidayRequests, onlineRequests, permissions, extraTimeRequests, users } from "../../models/schema"; 
import { SuccessResponse } from "../../utils/response";
import { notifyAdmins } from "../../services/notificationService";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const baseRequestSchema = z.object({
  body: z.object({
    date: z.string({ required_error: "Date is required" }),
  })
});

const permissionSchema = z.object({
  body: z.object({
    date: z.string({ required_error: "Date is required" }),
    hours: z.number({ required_error: "Hours are required" }).min(0.5),
    reason: z.string().optional(),
  })
});

const extraTimeSchema = z.object({
  body: z.object({
    date: z.string({ required_error: "Date is required" }),
    early_attend: z.boolean().optional().default(false),
    late_leave: z.boolean().optional().default(false),
  }).refine((data) => data.early_attend || data.late_leave, {
    message: "At least one of early_attend or late_leave must be true",
  })
});

export const submitHolidayRequest = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const validated = await baseRequestSchema.parseAsync({ body: req.body });
        
        await db.insert(holidayRequests).values({
            userId,
            date: new Date(validated.body.date),
            status: "pending"
        });

        // 📢 Notify Admins
        const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
        const userName = u?.name || "Employee";

        await notifyAdmins({
            type: "holiday_request",
            link: "/admin/holiday-requests",
            description: `${userName} submitted a holiday request for ${validated.body.date}`,
        });

        SuccessResponse(res, { message: "Holiday request submitted successfully" }, 201);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const submitOnlineRequest = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const validated = await baseRequestSchema.parseAsync({ body: req.body });
        
        await db.insert(onlineRequests).values({
            userId,
            date: new Date(validated.body.date),
            status: "pending"
        });

        // 📢 Notify Admins
        const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
        const userName = u?.name || "Employee";

        await notifyAdmins({
            type: "online_request",
            link: "/admin/online-requests",
            description: `${userName} submitted an online work request for ${validated.body.date}`,
        });

        SuccessResponse(res, { message: "Online request submitted successfully" }, 201);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const submitPermission = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const validated = await permissionSchema.parseAsync({ body: req.body });
        
        await db.insert(permissions).values({
            userId,
            date: new Date(validated.body.date),
            hours: validated.body.hours,
            reason: validated.body.reason || "",
            status: "pending"
        });

        // 📢 Notify Admins
        const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
        const userName = u?.name || "Employee";

        await notifyAdmins({
            type: "permission_request",
            link: "/admin/permissions",
            description: `${userName} submitted a permission request for ${validated.body.hours} hour(s) on ${validated.body.date}`,
        });

        SuccessResponse(res, { message: "Permission request submitted successfully" }, 201);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// 📌 Submit Extra Time Request (طلب وقت إضافي: حضور مبكر أو انصراف متأخر)
export const submitExtraTimeRequest = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const validated = await extraTimeSchema.parseAsync({ body: req.body });
        const { date, early_attend, late_leave } = validated.body;

        await db.insert(extraTimeRequests).values({
            userId,
            date: new Date(date),
            early_attend,
            late_leave,
            status: "pending"
        });

        // Fetch user name for notification
        const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
        const userName = u?.name || "Employee";

        const typeLabels: string[] = [];
        if (early_attend) typeLabels.push("Early Attend");
        if (late_leave) typeLabels.push("Late Leave");
        const typeStr = typeLabels.join(" & ");

        // 📢 Notify Admins
        await notifyAdmins({
            type: "extra_time_request",
            link: "/admin/extra-time-requests",
            description: `${userName} submitted an extra time request (${typeStr}) for ${date}`,
        });

        SuccessResponse(res, { message: "Extra time request submitted successfully" }, 201);
    } catch (error) {
        console.error("Error submitting extra time request:", error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, message: error.errors[0]?.message || "Validation Error" });
        }
        res.status(500).json({ success: false, message: (error as any)?.message || "Internal Server Error" });
    }
};

// 📌 Get Logged-in User's Extra Time Requests
export const getMyExtraTimeRequests = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const records = await db.select()
            .from(extraTimeRequests)
            .where(eq(extraTimeRequests.userId, userId))
            .orderBy(desc(extraTimeRequests.date));

        SuccessResponse(res, { data: records }, 200);
    } catch (error) {
        console.error("Error fetching my extra time requests:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
