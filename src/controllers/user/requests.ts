import { Request, Response } from "express";
import { db } from "../../models/db";
import { holidayRequests, onlineRequests, permissions } from "../../models/schema"; 
import { SuccessResponse } from "../../utils/response";
import { z } from "zod";

const baseRequestSchema = z.object({
  body: z.object({
    date: z.string({ required_error: "Date is required" }),
  })
});

const permissionSchema = z.object({
  body: z.object({
    date: z.string({ required_error: "Date is required" }),
    hours: z.number({ required_error: "Hours are required" }).min(1),
    reason: z.string().optional(),
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

        SuccessResponse(res, { message: "Permission request submitted successfully" }, 201);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
