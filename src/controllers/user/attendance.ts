import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { db } from "../../models/db";
import { attendance, shifts, users, zones } from "../../models/schema"; 
import { eq, desc, and, isNull, gte, lte } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";
import { calculateAttendanceReport } from "../../services/attendanceService";
import { executeCheckInLogic, executeCheckOutLogic, getOpenAttendanceRecord } from "../../services/attendanceActionService";

function euclideanDistance(desc1: number[], desc2: number[]): number {
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
        const diff = desc1[i] - desc2[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

function parseFaceVector(val: any): number[] | null {
    if (!val) return null;
    let parsed = val;
    while (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            return null;
        }
    }
    return Array.isArray(parsed) && parsed.length === 128 ? (parsed as number[]) : null;
}

export type VerificationMethod = 'photo_id' | 'finger_print' | 'passkey';

export interface CredentialVerificationResult {
    valid: boolean;
    method?: VerificationMethod;
    statusCode?: number;
    message?: string;
    details?: any;
}

export async function verifyUserCredential(
    user: { id: string; name?: string; vector_image_array?: any; fingerprint?: string | null; passkey?: string | null },
    body: any,
    action: 'checkin' | 'checkout'
): Promise<CredentialVerificationResult> {
    const rawKey = body.key ? String(body.key).toLowerCase().trim() : "";
    const rawType = body.type ? String(body.type).toLowerCase().trim() : "";
    const rawMethod = body.method ? String(body.method).toLowerCase().trim() : "";
    const keyOrType = rawKey || rawType || rawMethod;

    let method: VerificationMethod | null = null;
    let credential: any = null;

    if (["photo_id", "photo", "face", "face_id", "faceid"].includes(keyOrType)) {
        method = "photo_id";
        credential = body.payload ?? body.face_descriptor ?? body.descriptor;
    } else if (["finger_print", "fingerprint", "finger"].includes(keyOrType)) {
        method = "finger_print";
        credential = body.payload ?? body.fingerprint ?? body.finger_print;
    } else if (["passkey", "pass_key", "password", "device_key"].includes(keyOrType)) {
        method = "passkey";
        credential = body.payload ?? body.passkey ?? body.password;
    } else {
        // Auto-detect based on provided fields
        if (body.passkey !== undefined && body.passkey !== null) {
            method = "passkey";
            credential = body.passkey;
        } else if (body.finger_print !== undefined || body.fingerprint !== undefined) {
            method = "finger_print";
            credential = body.finger_print ?? body.fingerprint;
        } else if (Array.isArray(body.payload) && body.payload.length === 128) {
            method = "photo_id";
            credential = body.payload;
        } else if (body.key && !["photo_id", "photo", "face", "face_id", "finger_print", "fingerprint"].includes(keyOrType)) {
            // User passed a direct key payload (e.g. device password inside key)
            method = "passkey";
            credential = body.key;
        } else if (typeof body.payload === "string" && body.payload.trim()) {
            if (user.passkey && !user.fingerprint) {
                method = "passkey";
                credential = body.payload;
            } else if (user.fingerprint && !user.passkey) {
                method = "finger_print";
                credential = body.payload;
            }
        }
    }

    if (!method) {
        return {
            valid: false,
            statusCode: 400,
            message: "Verification credential is required. Please provide photo_id (payload vector), finger_print, or passkey."
        };
    }

    // 1. Photo ID / Face ID
    if (method === "photo_id") {
        if (!credential || !Array.isArray(credential) || credential.length !== 128) {
            return {
                valid: false,
                statusCode: 400,
                message: "Invalid Photo ID payload. Expected 128-dimensional face descriptor array."
            };
        }

        const savedVector = parseFaceVector(user.vector_image_array);
        if (!savedVector || savedVector.length !== 128) {
            return {
                valid: false,
                statusCode: 403,
                message: "No Photo ID / Face ID registered for this user."
            };
        }

        const distance = euclideanDistance(credential, savedVector);
        console.log(`[Photo ID ${action.toUpperCase()}] User: ${user.id} | Distance: ${distance.toFixed(4)}`);

        if (isNaN(distance) || distance > 0.6) {
            return {
                valid: false,
                statusCode: 403,
                message: `Photo ID mismatch. Verification failed. (Score: ${isNaN(distance) ? 'Invalid' : distance.toFixed(4)})`,
                details: { distance: Number(distance.toFixed(4)), threshold: 0.6 }
            };
        }

        return {
            valid: true,
            method: "photo_id",
            details: { distance: Number(distance.toFixed(4)), threshold: 0.6 }
        };
    }

    // 2. Fingerprint
    if (method === "finger_print") {
        const sentFingerprint = typeof credential === "string" ? credential.trim() : "";
        if (!sentFingerprint) {
            return {
                valid: false,
                statusCode: 400,
                message: "Valid fingerprint string payload is required."
            };
        }

        if (!user.fingerprint || !user.fingerprint.trim()) {
            return {
                valid: false,
                statusCode: 403,
                message: "No fingerprint registered for this user."
            };
        }

        if (user.fingerprint.trim() !== sentFingerprint) {
            return {
                valid: false,
                statusCode: 403,
                message: "Fingerprint mismatch. Verification failed."
            };
        }

        console.log(`[Fingerprint ${action.toUpperCase()}] User: ${user.id} | Verified successfully`);
        return { valid: true, method: "finger_print" };
    }

    // 3. Passkey (Device Password / Passkey)
    if (method === "passkey") {
        const sentPasskey = typeof credential === "string" ? credential.trim() : (credential ? String(credential).trim() : "");
        if (!sentPasskey) {
            return {
                valid: false,
                statusCode: 400,
                message: "Valid passkey string is required."
            };
        }

        if (!user.passkey || !user.passkey.trim()) {
            return {
                valid: false,
                statusCode: 403,
                message: "No passkey registered for this user."
            };
        }

        const savedPasskey = user.passkey.trim();
        let isMatch = false;

        // Support both bcrypt hash or direct string match
        if (savedPasskey.startsWith("$2a$") || savedPasskey.startsWith("$2b$")) {
            isMatch = await bcrypt.compare(sentPasskey, savedPasskey);
        } else {
            isMatch = (savedPasskey === sentPasskey);
        }

        if (!isMatch) {
            return {
                valid: false,
                statusCode: 403,
                message: "Passkey mismatch. Verification failed."
            };
        }

        console.log(`[Passkey ${action.toUpperCase()}] User: ${user.id} | Verified successfully`);
        return { valid: true, method: "passkey" };
    }

    return {
        valid: false,
        statusCode: 400,
        message: "Unsupported verification method."
    };
}

const getClientIp = (req: Request): string => {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
        return forwarded.split(",")[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || "";
};

export const getShift = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const userRecord = await db.select({
            shift_id: users.shift_id,
            days: shifts.days,
        }).from(users)
        .where(eq(users.id, userId))
        .leftJoin(shifts, eq(users.shift_id, shifts.id))
        .limit(1);

        let daysData: any = userRecord[0]?.days;
        if (typeof daysData === 'string') {
            try {
                daysData = JSON.parse(daysData);
            } catch (e) {
                daysData = null;
            }
        }

        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayStr = daysOfWeek[new Date().getDay()];

        const todayConfig = daysData && typeof daysData === 'object' ? daysData[todayStr] : null;

        const from = todayConfig?.from || "09:00";
        const to = todayConfig?.to || "17:00";

        return SuccessResponse(res, { from, to }, 200);
    } catch (error) {
        console.error("Error in getShift:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getAttendanceStatus = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const currentUser = await db.select({
            id: users.id,
            zone_id: users.zone_id,
            vector_image_array: users.vector_image_array,
            fingerprint: users.fingerprint,
            passkey: users.passkey,
        }).from(users).where(eq(users.id, userId)).limit(1);

        const zoneId = currentUser[0]?.zone_id;
        let userZone: any = null;
        if (zoneId) {
            const [z] = await db.select().from(zones).where(eq(zones.id, zoneId)).limit(1);
            userZone = z || null;
        }

        const effectiveIpStatus = Boolean(userZone?.router_ip_status ?? userZone?.router_mac_status);
        const effectiveIp = userZone?.router_ip || userZone?.router_mac || null;

        const hasPhotoId = Boolean(parseFaceVector(currentUser[0]?.vector_image_array));
        const hasFingerprint = Boolean(currentUser[0]?.fingerprint && currentUser[0]?.fingerprint.trim());
        const hasPasskey = Boolean(currentUser[0]?.passkey && currentUser[0]?.passkey.trim());

        const attendanceSettings = {
            face_id: true, // For backwards compatibility with front-end components
            photo_id: hasPhotoId,
            has_photo_id: hasPhotoId,
            finger_print: hasFingerprint,
            has_fingerprint: hasFingerprint,
            passkey: hasPasskey,
            has_passkey: hasPasskey,
            router_ip_status: effectiveIpStatus,
            router_ip: effectiveIp,
            router_mac_status: effectiveIpStatus,
            router_mac: effectiveIp,
            zone_name: userZone?.name || null,
            zone_id: userZone?.id || null,
        };

        const openRecord = await getOpenAttendanceRecord(userId);

        const resData = {
            isCheckedIn: Boolean(openRecord),
            record: openRecord,
            settings: attendanceSettings,
            zone: userZone ? {
                id: userZone.id,
                name: userZone.name,
                router_ip: effectiveIp,
                router_ip_status: effectiveIpStatus,
                router_mac: effectiveIp,
                router_mac_status: effectiveIpStatus,
                locations: userZone.locations,
            } : null,
            ip_address: effectiveIp, // Direct access to router IP of my zone
            router_ip: effectiveIp,
            mac_address: effectiveIp,
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
            return SuccessResponse(res, { zone: null, ip_address: null, router_ip: null, mac_address: null, message: "No zone assigned" }, 200);
        }

        const [userZone] = await db.select().from(zones).where(eq(zones.id, zoneId)).limit(1);
        const effectiveIpStatus = Boolean(userZone?.router_ip_status ?? userZone?.router_mac_status);
        const effectiveIp = userZone?.router_ip || userZone?.router_mac || null;

        return SuccessResponse(res, {
            zone: userZone || null,
            ip_address: effectiveIp,
            router_ip: effectiveIp,
            router_ip_status: effectiveIpStatus,
            mac_address: effectiveIp,
            router_mac: effectiveIp,
            router_mac_status: effectiveIpStatus,
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

        const { lat, lng } = req.body;
        const macAddress = req.body.mac_address || req.body.router_mac || req.body.mac || (req.headers['x-mac-address'] as string) || (req.headers['x-router-mac'] as string);
        
        const currentUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!currentUser.length) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // 🔒 Verify Credential (photo_id, finger_print, or passkey)
        const verification = await verifyUserCredential(currentUser[0], req.body, "checkin");
        if (!verification.valid) {
            return res.status(verification.statusCode || 400).json({
                success: false,
                message: verification.message,
                details: verification.details
            });
        }

        const clientIp = getClientIp(req);
        const result = await executeCheckInLogic({ userId, lat, lng, clientIp, macAddress });

        if (!result.success) {
            return res.status(result.statusCode || 400).json({ success: false, message: result.message });
        }

        SuccessResponse(res, {
            message: result.message,
            method: verification.method,
            onsite: result.onsite,
            isRequestOnline: result.isRequestOnline
        }, 201);
    } catch (error) {
        console.error("Error during check-in:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const checkOut = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id; 
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const { lat, lng } = req.body;
        const macAddress = req.body.mac_address || req.body.router_mac || req.body.mac || (req.headers['x-mac-address'] as string) || (req.headers['x-router-mac'] as string);

        const currentUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!currentUser.length) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // 🔒 Verify Credential (photo_id, finger_print, or passkey)
        const verification = await verifyUserCredential(currentUser[0], req.body, "checkout");
        if (!verification.valid) {
            return res.status(verification.statusCode || 400).json({
                success: false,
                message: verification.message,
                details: verification.details
            });
        }

        const clientIp = getClientIp(req);
        const result = await executeCheckOutLogic({ userId, lat, lng, clientIp, macAddress });

        if (!result.success) {
            return res.status(result.statusCode || 400).json({ success: false, message: result.message });
        }

        SuccessResponse(res, {
            message: result.message,
            method: verification.method,
            hours: result.hours,
            delay: result.delay
        }, 200);
    } catch (error) {
        console.error("Error during check-out:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// 📌 Register or update Passkey (Device password / Passkey)
export const registerPasskey = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id || req.body.userId;
        const passkey = req.body.passkey || req.body.payload || req.body.key;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        if (!passkey || typeof passkey !== "string" || !passkey.trim()) {
            return res.status(400).json({
                success: false,
                message: "Valid passkey string is required",
            });
        }

        const [user] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const hashed = await bcrypt.hash(passkey.trim(), 10);
        await db
            .update(users)
            .set({ passkey: hashed })
            .where(eq(users.id, userId));

        SuccessResponse(res, { message: "Passkey registered successfully", registered: true }, 200);
    } catch (error) {
        console.error("Error registering passkey:", error);
        res.status(500).json({
            success: false,
            message: (error as any)?.message || "Internal Server Error",
        });
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
