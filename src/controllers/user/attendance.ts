import { Request, Response } from "express";
import { db } from "../../models/db";
import { attendance, onlineRequests, settings, permissions, users, zones, shifts } from "../../models/schema"; 
import { eq, desc, and, isNull, gte, lte } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";
import { calculateAttendanceReport } from "../../services/attendanceService";

function isPointInPolygon(lat: number, lng: number, polygon: number[][]) {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const x_i = polygon[i][0], y_i = polygon[i][1];
        const x_j = polygon[j][0], y_j = polygon[j][1];
        
        const intersect = ((y_i > lng) !== (y_j > lng)) && (lat < (x_j - x_i) * (lng - y_i) / (y_j - y_i) + x_i);
        if (intersect) isInside = !isInside;
    }
    return isInside;
}
function euclideanDistance(desc1: number[], desc2: number[]): number {
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
        const diff = desc1[i] - desc2[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

export const getAttendanceStatus = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const sysSettings = await db.select().from(settings).limit(1);
        const systemSettings = sysSettings[0] || {};
        
        const attendanceSettings = {
            face_id: systemSettings.face_id ?? false,
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

        const { lat, lng, method, payload } = req.body;
        
        const currentUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        const zoneId = currentUser[0]?.zone_id;
        
        let locations: any[] = [];
        if (zoneId) {
            const userZone = await db.select().from(zones).where(eq(zones.id, zoneId)).limit(1);
            locations = (userZone[0]?.locations as any) || [];
            if (typeof locations === 'string') {
                try { locations = JSON.parse(locations); } catch (e) { locations = []; }
            }
        }

        const sysSettings = await db.select().from(settings).limit(1);
        const systemSettings = sysSettings[0];
        
        // 🔒 Validate Method (Face ID / Router IP)
        if (systemSettings?.face_id || systemSettings?.router_ip_status) {
            if (!method) {
                return res.status(400).json({ success: false, message: "Attendance method required (face or router)" });
            }

            if (method === "router" && systemSettings.router_ip_status) {
                let userIp = req.ip || req.socket.remoteAddress || "";
                if (userIp === "::1" || userIp === "::ffff:127.0.0.1") userIp = "127.0.0.1";
                if (userIp !== systemSettings.router_ip) {
                    return res.status(403).json({ success: false, message: "Invalid Router IP. Please connect to the correct network." });
                }
            } else if (method === "face" && systemSettings.face_id) {
                if (!payload || !Array.isArray(payload) || payload.length !== 128) {
                    return res.status(400).json({ success: false, message: "Invalid Face ID payload." });
                }
                const savedVectorStr = currentUser[0]?.vector_image_array;
                if (!savedVectorStr) {
                    return res.status(403).json({ success: false, message: "No Face ID registered for this user." });
                }
                let savedVector: number[] = [];
                try {
                    savedVector = JSON.parse(savedVectorStr as string);
                } catch(e) {
                    return res.status(500).json({ success: false, message: "Corrupted Face ID data." });
                }
                const distance = euclideanDistance(payload, savedVector);
                if (distance > 0.45) {
                    return res.status(403).json({ success: false, message: `Face ID mismatch. Verification failed. (Score: ${distance.toFixed(2)})` });
                }
            } else {
                return res.status(400).json({ success: false, message: "Selected method is not enabled or invalid." });
            }
        }

        let onlineDays = (systemSettings?.online_days as any) || [];
        if (typeof onlineDays === 'string') {
            try { onlineDays = JSON.parse(onlineDays); } catch (e) { onlineDays = []; }
        }

        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDayName = daysOfWeek[new Date().getDay()];
        const isOnlineDay = Array.isArray(onlineDays) && onlineDays.includes(currentDayName.toLowerCase());

        let onsite = false;
        if (lat !== undefined && lng !== undefined && Array.isArray(locations) && locations.length >= 3) {
            if (isPointInPolygon(lat, lng, locations)) {
                onsite = true;
            }
        }

        let isRequestOnline = false;
        if (isOnlineDay) {
            isRequestOnline = true;
            onsite = false;
        } else if (!onsite) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const requests = await db.select().from(onlineRequests)
                .where(and(
                    eq(onlineRequests.userId, userId),
                    eq(onlineRequests.status, "approve"),
                    gte(onlineRequests.date, todayStart),
                    lte(onlineRequests.date, todayEnd)
                ));
            
            if (requests.length > 0) {
                isRequestOnline = true;
            }
        }

        await db.insert(attendance).values({
            userId,
            from: new Date(),
            onsite,
            isRequestOnline
        });

        SuccessResponse(res, { message: "Checked in successfully", onsite, isRequestOnline }, 201);
    } catch (error) {
        console.error("Error during check-in:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const checkOut = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id; 
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const { lat, lng, method, payload } = req.body;

        const openRecords = await db.select().from(attendance)
            .where(and(
                eq(attendance.userId, userId),
                isNull(attendance.to)
            ))
            .orderBy(desc(attendance.from))
            .limit(1);

        if (openRecords.length === 0) {
            return res.status(400).json({ success: false, message: "No active check-in found." });
        }

        const record = openRecords[0];
        const toDate = new Date();

        const currentUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);

        const sysSettings = await db.select().from(settings).limit(1);
        const systemSettings = sysSettings[0];

        // 🔒 Validate Method (Face ID / Router IP)
        if (systemSettings?.face_id || systemSettings?.router_ip_status) {
            if (!method) {
                return res.status(400).json({ success: false, message: "Attendance method required (face or router)" });
            }

            if (method === "router" && systemSettings.router_ip_status) {
                let userIp = req.ip || req.socket.remoteAddress || "";
                if (userIp === "::1" || userIp === "::ffff:127.0.0.1") userIp = "127.0.0.1";
                if (userIp !== systemSettings.router_ip) {
                    return res.status(403).json({ success: false, message: "Invalid Router IP. Please connect to the correct network." });
                }
            } else if (method === "face" && systemSettings.face_id) {
                if (!payload || !Array.isArray(payload) || payload.length !== 128) {
                    return res.status(400).json({ success: false, message: "Invalid Face ID payload." });
                }
                const savedVectorStr = currentUser[0]?.vector_image_array;
                if (!savedVectorStr) {
                    return res.status(403).json({ success: false, message: "No Face ID registered for this user." });
                }
                let savedVector: number[] = [];
                try {
                    savedVector = JSON.parse(savedVectorStr as string);
                } catch(e) {
                    return res.status(500).json({ success: false, message: "Corrupted Face ID data." });
                }
                const distance = euclideanDistance(payload, savedVector);
                if (distance > 0.45) {
                    return res.status(403).json({ success: false, message: `Face ID mismatch. Verification failed. (Score: ${distance.toFixed(2)})` });
                }
            } else {
                return res.status(400).json({ success: false, message: "Selected method is not enabled or invalid." });
            }
        }

        const zoneId = currentUser[0]?.zone_id;
        const shiftId = currentUser[0]?.shift_id;
        
        let locations: any[] = [];
        if (zoneId) {
            const userZone = await db.select().from(zones).where(eq(zones.id, zoneId)).limit(1);
            locations = (userZone[0]?.locations as any) || [];
            if (typeof locations === 'string') {
                try { locations = JSON.parse(locations); } catch (e) { locations = []; }
            }
        }

        let departureOnsite = false;
        if (lat !== undefined && lng !== undefined && Array.isArray(locations) && locations.length >= 3) {
            if (isPointInPolygon(lat, lng, locations)) {
                departureOnsite = true;
            }
        }

        const recordFromDate = new Date(record.from);
        const diffMs = toDate.getTime() - recordFromDate.getTime();
        let workedHours = diffMs / (1000 * 60 * 60);

        let delay = 0;
        let earlyLeave = 0;
        
        const delayPermissionMinutes = systemSettings?.delay_premission_minutes || 0;

        let userShift = null;
        if (shiftId) {
            const fetchedShift = await db.select().from(shifts).where(eq(shifts.id, shiftId)).limit(1);
            userShift = fetchedShift[0];
        }

        if (userShift && userShift.days) {
            let daysData: any = userShift.days;
            if (typeof daysData === 'string') {
                try { daysData = JSON.parse(daysData); } catch (e) { daysData = {}; }
            }

            const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const currentDayStr = daysOfWeek[recordFromDate.getDay()];
            
            const todayShift = daysData[currentDayStr];

            if (todayShift && todayShift.active && todayShift.from && todayShift.to) {
                const [shiftFromH, shiftFromM] = todayShift.from.split(':').map(Number);
                const [shiftToH, shiftToM] = todayShift.to.split(':').map(Number);

                const expectedStart = new Date(recordFromDate);
                expectedStart.setHours(shiftFromH, shiftFromM, 0, 0);

                let expectedEnd = new Date(recordFromDate);
                expectedEnd.setHours(shiftToH, shiftToM, 0, 0);
                
                if (expectedEnd.getTime() < expectedStart.getTime()) {
                    expectedEnd.setDate(expectedEnd.getDate() + 1);
                }

                const requiredHours = (expectedEnd.getTime() - expectedStart.getTime()) / (1000 * 60 * 60);

                if (record.isRequestOnline || !record.onsite) {
                    // Online mode: flexible hours, delay is just shortage of total hours
                    if (workedHours < requiredHours) {
                        delay = requiredHours - workedHours;
                    }
                } else {
                    const lateMs = recordFromDate.getTime() - expectedStart.getTime();
                    if (lateMs > 0) {
                        const lateMinutes = lateMs / (1000 * 60);
                        if (lateMinutes > delayPermissionMinutes) {
                            delay += lateMs / (1000 * 60 * 60); 
                        }
                    }

                    const earlyMs = expectedEnd.getTime() - toDate.getTime();
                    if (earlyMs > 0) {
                        earlyLeave = earlyMs / (1000 * 60 * 60);
                    }
                }
            }
        }

        const todayStart = new Date(recordFromDate);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(recordFromDate);
        todayEnd.setHours(23, 59, 59, 999);

        const permRecords = await db.select().from(permissions)
            .where(and(
                eq(permissions.userId, userId),
                eq(permissions.status, "approve"),
                gte(permissions.date, todayStart),
                lte(permissions.date, todayEnd)
            ));

        let totalPenalty = delay + earlyLeave;
        let permissionHoursCovered = 0;

        for (const p of permRecords) {
            permissionHoursCovered += p.hours;
        }

        if (totalPenalty > 0 && permissionHoursCovered > 0) {
            if (permissionHoursCovered >= totalPenalty) {
                totalPenalty = 0; 
            } else {
                totalPenalty -= permissionHoursCovered;
            }
        }

        await db.update(attendance).set({
            to: toDate,
            departureOnsite,
            hours: workedHours,
            delay: totalPenalty
        }).where(eq(attendance.id, record.id));

        SuccessResponse(res, { message: "Checked out successfully", hours: workedHours, delay: totalPenalty }, 200);
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
