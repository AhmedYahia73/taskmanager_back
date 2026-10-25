import { Request, Response } from "express";
import { db } from "../../models/db";
import { attendance, settings, users } from "../../models/schema"; 
import { eq, desc, and, isNull } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";
import { calculateAttendanceReport } from "../../services/attendanceService";
import { executeCheckInLogic, executeCheckOutLogic } from "../../services/attendanceActionService";

function euclideanDistance(desc1: number[], desc2: number[]): number {
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
        const diff = desc1[i] - desc2[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

const getClientIp = (req: Request): string => {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
        return forwarded.split(",")[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || "";
};

export const getAttendanceStatus = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const sysSettings = await db.select().from(settings).limit(1);
        const systemSettings = sysSettings[0] || {};
        
        const attendanceSettings = {
            face_id: true,
            router_ip_status: systemSettings.router_ip_status ?? false
        };

        const openRecords = await db.select().from(attendance)
            .where(and(
                eq(attendance.userId, userId),
                isNull(attendance.to)
            ))
            .orderBy(desc(attendance.from))
            .limit(1);

        if (openRecords.length > 0) {
            return SuccessResponse(res, { isCheckedIn: true, record: openRecords[0], settings: attendanceSettings }, 200);
        }

        return SuccessResponse(res, { isCheckedIn: false, record: null, settings: attendanceSettings }, 200);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const checkIn = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id; 
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const { lat, lng, payload } = req.body;
        
        const currentUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!currentUser.length) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // 🔒 Validate Face ID
        if (!payload || !Array.isArray(payload) || payload.length !== 128) {
            return res.status(400).json({ success: false, message: "Invalid Face ID payload." });
        }
        const savedVectorStr = currentUser[0]?.vector_image_array;
        if (!savedVectorStr) {
            return res.status(403).json({ success: false, message: "No Face ID registered for this user." });
        }
        let savedVector: number[] = [];
        try {
            let parsed = savedVectorStr;
            while (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
            }
            savedVector = parsed as number[];
        } catch(e) {
            return res.status(500).json({ success: false, message: "Corrupted Face ID data." });
        }
        if (!Array.isArray(savedVector) || savedVector.length !== 128) {
            return res.status(500).json({ success: false, message: `Invalid saved Face ID data.` });
        }
        const distance = euclideanDistance(payload, savedVector);
        console.log(`[Face ID CheckIn] User: ${userId} | Distance: ${distance.toFixed(4)}`);
        if (isNaN(distance) || distance > 0.6) {
            return res.status(403).json({ success: false, message: `Face ID mismatch. Verification failed. (Score: ${isNaN(distance) ? 'Invalid' : distance.toFixed(4)})` });
        }

        const clientIp = getClientIp(req);
        const result = await executeCheckInLogic({ userId, lat, lng, clientIp });

        if (!result.success) {
            return res.status(result.statusCode || 400).json({ success: false, message: result.message });
        }

        SuccessResponse(res, { message: result.message, onsite: result.onsite, isRequestOnline: result.isRequestOnline }, 201);
    } catch (error) {
        console.error("Error during check-in:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const checkOut = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id; 
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const { lat, lng, payload } = req.body;

        const currentUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!currentUser.length) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // 🔒 Validate Face ID
        if (!payload || !Array.isArray(payload) || payload.length !== 128) {
            return res.status(400).json({ success: false, message: "Invalid Face ID payload." });
        }
        const savedVectorStr = currentUser[0]?.vector_image_array;
        if (!savedVectorStr) {
            return res.status(403).json({ success: false, message: "No Face ID registered for this user." });
        }
        let savedVector: number[] = [];
        try {
            let parsed = savedVectorStr;
            while (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
            }
            savedVector = parsed as number[];
        } catch(e) {
            return res.status(500).json({ success: false, message: "Corrupted Face ID data." });
        }
        if (!Array.isArray(savedVector) || savedVector.length !== 128) {
            return res.status(500).json({ success: false, message: `Invalid saved Face ID data.` });
        }
        const distance = euclideanDistance(payload, savedVector);
        console.log(`[Face ID CheckOut] User: ${userId} | Distance: ${distance.toFixed(4)}`);
        if (isNaN(distance) || distance > 0.6) {
            return res.status(403).json({ success: false, message: `Face ID mismatch. Verification failed. (Score: ${isNaN(distance) ? 'Invalid' : distance.toFixed(4)})` });
        }

        const clientIp = getClientIp(req);
        const result = await executeCheckOutLogic({ userId, lat, lng, clientIp });

        if (!result.success) {
            return res.status(result.statusCode || 400).json({ success: false, message: result.message });
        }

        SuccessResponse(res, { message: result.message, hours: result.hours, delay: result.delay }, 200);
    } catch (error) {
        console.error("Error during check-out:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getMyAttendanceReport = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id; 
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const from = (req.query.from as string) || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const to = (req.query.to as string) || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const data = await calculateAttendanceReport(userId, from, to, page, limit);
        SuccessResponse(res, data, 200);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
