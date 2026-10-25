import { Request, Response } from "express";
import { db } from "../../models/db";
import { attendance, settings, users, zones } from "../../models/schema"; 
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

        const currentUser = await db.select({
            id: users.id,
            zone_id: users.zone_id,
        }).from(users).where(eq(users.id, userId)).limit(1);

        const zoneId = currentUser[0]?.zone_id;
        let userZone: any = null;
        if (zoneId) {
            const [z] = await db.select().from(zones).where(eq(zones.id, zoneId)).limit(1);
            userZone = z || null;
        }

        const attendanceSettings = {
            face_id: true,
            router_mac_status: Boolean(userZone?.router_mac_status),
            router_mac: userZone?.router_mac || null,
            zone_name: userZone?.name || null,
            zone_id: userZone?.id || null,
        };

        const openRecords = await db.select().from(attendance)
            .where(and(
                eq(attendance.userId, userId),
                isNull(attendance.to)
            ))
            .orderBy(desc(attendance.from))
            .limit(1);

        const resData = {
            isCheckedIn: openRecords.length > 0,
            record: openRecords[0] || null,
            settings: attendanceSettings,
            zone: userZone ? {
                id: userZone.id,
                name: userZone.name,
                router_mac: userZone.router_mac,
                router_mac_status: Boolean(userZone.router_mac_status),
                locations: userZone.locations,
            } : null,
            mac_address: userZone?.router_mac || null, // Direct access to mac address of my zone
        };

        return SuccessResponse(res, resData, 200);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getMyZone = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const currentUser = await db.select({
            id: users.id,
            name: users.name,
            zone_id: users.zone_id,
        }).from(users).where(eq(users.id, userId)).limit(1);

        const zoneId = currentUser[0]?.zone_id;
        if (!zoneId) {
            return SuccessResponse(res, { zone: null, mac_address: null, router_mac: null, message: "No zone assigned" }, 200);
        }

        const [userZone] = await db.select().from(zones).where(eq(zones.id, zoneId)).limit(1);

        return SuccessResponse(res, {
            zone: userZone || null,
            mac_address: userZone?.router_mac || null,
            router_mac: userZone?.router_mac || null,
            router_mac_status: Boolean(userZone?.router_mac_status),
        }, 200);
    } catch (error) {
        console.error("Error fetching my zone:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const checkIn = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id; 
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const { lat, lng, payload } = req.body;
        const macAddress = req.body.mac_address || req.body.router_mac || req.body.mac || (req.headers['x-mac-address'] as string) || (req.headers['x-router-mac'] as string);
        
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
        const result = await executeCheckInLogic({ userId, lat, lng, clientIp, macAddress });

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
        const macAddress = req.body.mac_address || req.body.router_mac || req.body.mac || (req.headers['x-mac-address'] as string) || (req.headers['x-router-mac'] as string);

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
        const result = await executeCheckOutLogic({ userId, lat, lng, clientIp, macAddress });

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

        const pad = (num: number) => num.toString().padStart(2, '0');
        let from = req.query.from as string;
        let to = req.query.to as string;

        if (!from && !to && req.query.month && req.query.year) {
            const month = parseInt(req.query.month as string, 10);
            const year = parseInt(req.query.year as string, 10);
            if (!isNaN(month) && !isNaN(year) && month >= 1 && month <= 12) {
                const lastDay = new Date(year, month, 0).getDate();
                from = `${year}-${pad(month)}-01`;
                to = `${year}-${pad(month)}-${pad(lastDay)}`;
            }
        }

        if (!from || !to) {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const lastDay = new Date(year, month, 0).getDate();
            if (!from) from = `${year}-${pad(month)}-01`;
            if (!to) to = `${year}-${pad(month)}-${pad(lastDay)}`;
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const data = await calculateAttendanceReport(userId, from, to, page, limit);
        SuccessResponse(res, data, 200);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
