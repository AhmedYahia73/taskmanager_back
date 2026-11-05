"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyAttendanceReport = exports.registerPasskey = exports.checkOut = exports.checkIn = exports.getMyZone = exports.getAttendanceStatus = exports.getShift = void 0;
exports.verifyUserCredential = verifyUserCredential;
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const attendanceService_1 = require("../../services/attendanceService");
const attendanceActionService_1 = require("../../services/attendanceActionService");
function euclideanDistance(desc1, desc2) {
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
        const diff = desc1[i] - desc2[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}
function parseFaceVector(val) {
    if (!val)
        return null;
    let parsed = val;
    while (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        }
        catch {
            return null;
        }
    }
    return Array.isArray(parsed) && parsed.length === 128 ? parsed : null;
}
async function verifyUserCredential(user, body, action) {
    const rawKey = body.key ? String(body.key).toLowerCase().trim() : "";
    const rawType = body.type ? String(body.type).toLowerCase().trim() : "";
    const rawMethod = body.method ? String(body.method).toLowerCase().trim() : "";
    const keyOrType = rawKey || rawType || rawMethod;
    let method = null;
    let credential = null;
    if (["photo_id", "photo", "face", "face_id", "faceid"].includes(keyOrType)) {
        method = "photo_id";
        credential = body.payload ?? body.face_descriptor ?? body.descriptor;
    }
    else if (["finger_print", "fingerprint", "finger"].includes(keyOrType)) {
        method = "finger_print";
        credential = body.payload ?? body.fingerprint ?? body.finger_print;
    }
    else if (["passkey", "pass_key", "password", "device_key"].includes(keyOrType)) {
        method = "passkey";
        credential = body.payload ?? body.passkey ?? body.password;
    }
    else {
        // Auto-detect based on provided fields
        if (body.passkey !== undefined && body.passkey !== null) {
            method = "passkey";
            credential = body.passkey;
        }
        else if (body.finger_print !== undefined || body.fingerprint !== undefined) {
            method = "finger_print";
            credential = body.finger_print ?? body.fingerprint;
        }
        else if (Array.isArray(body.payload) && body.payload.length === 128) {
            method = "photo_id";
            credential = body.payload;
        }
        else if (body.key && !["photo_id", "photo", "face", "face_id", "finger_print", "fingerprint"].includes(keyOrType)) {
            // User passed a direct key payload (e.g. device password inside key)
            method = "passkey";
            credential = body.key;
        }
        else if (typeof body.payload === "string" && body.payload.trim()) {
            if (user.passkey && !user.fingerprint) {
                method = "passkey";
                credential = body.payload;
            }
            else if (user.fingerprint && !user.passkey) {
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
            isMatch = await bcrypt_1.default.compare(sentPasskey, savedPasskey);
        }
        else {
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
const getClientIp = (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
        return forwarded.split(",")[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || "";
};
const getShift = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const userRecord = await db_1.db.select({
            shift_id: schema_1.users.shift_id,
            days: schema_1.shifts.days,
        }).from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .leftJoin(schema_1.shifts, (0, drizzle_orm_1.eq)(schema_1.users.shift_id, schema_1.shifts.id))
            .limit(1);
        let daysData = userRecord[0]?.days;
        if (typeof daysData === 'string') {
            try {
                daysData = JSON.parse(daysData);
            }
            catch (e) {
                daysData = null;
            }
        }
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayStr = daysOfWeek[new Date().getDay()];
        const todayConfig = daysData && typeof daysData === 'object' ? daysData[todayStr] : null;
        const from = todayConfig?.from || "09:00";
        const to = todayConfig?.to || "17:00";
        return (0, response_1.SuccessResponse)(res, { from, to }, 200);
    }
    catch (error) {
        console.error("Error in getShift:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getShift = getShift;
const getAttendanceStatus = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const currentUser = await db_1.db.select({
            id: schema_1.users.id,
            zone_id: schema_1.users.zone_id,
            vector_image_array: schema_1.users.vector_image_array,
            fingerprint: schema_1.users.fingerprint,
            passkey: schema_1.users.passkey,
        }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
        const zoneId = currentUser[0]?.zone_id;
        let userZone = null;
        if (zoneId) {
            const [z] = await db_1.db.select().from(schema_1.zones).where((0, drizzle_orm_1.eq)(schema_1.zones.id, zoneId)).limit(1);
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
        const openRecord = await (0, attendanceActionService_1.getOpenAttendanceRecord)(userId);
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
        return (0, response_1.SuccessResponse)(res, resData, 200);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getAttendanceStatus = getAttendanceStatus;
const getMyZone = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const currentUser = await db_1.db.select({
            id: schema_1.users.id,
            name: schema_1.users.name,
            zone_id: schema_1.users.zone_id,
        }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
        const zoneId = currentUser[0]?.zone_id;
        if (!zoneId) {
            return (0, response_1.SuccessResponse)(res, { zone: null, ip_address: null, router_ip: null, mac_address: null, message: "No zone assigned" }, 200);
        }
        const [userZone] = await db_1.db.select().from(schema_1.zones).where((0, drizzle_orm_1.eq)(schema_1.zones.id, zoneId)).limit(1);
        const effectiveIpStatus = Boolean(userZone?.router_ip_status ?? userZone?.router_mac_status);
        const effectiveIp = userZone?.router_ip || userZone?.router_mac || null;
        return (0, response_1.SuccessResponse)(res, {
            zone: userZone || null,
            ip_address: effectiveIp,
            router_ip: effectiveIp,
            router_ip_status: effectiveIpStatus,
            mac_address: effectiveIp,
            router_mac: effectiveIp,
            router_mac_status: effectiveIpStatus,
        }, 200);
    }
    catch (error) {
        console.error("Error fetching my zone:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getMyZone = getMyZone;
const checkIn = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const { lat, lng } = req.body;
        const macAddress = req.body.mac_address || req.body.router_mac || req.body.mac || req.headers['x-mac-address'] || req.headers['x-router-mac'];
        const currentUser = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
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
        const result = await (0, attendanceActionService_1.executeCheckInLogic)({ userId, lat, lng, clientIp, macAddress });
        if (!result.success) {
            return res.status(result.statusCode || 400).json({ success: false, message: result.message });
        }
        (0, response_1.SuccessResponse)(res, {
            message: result.message,
            method: verification.method,
            onsite: result.onsite,
            isRequestOnline: result.isRequestOnline
        }, 201);
    }
    catch (error) {
        console.error("Error during check-in:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.checkIn = checkIn;
const checkOut = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const { lat, lng } = req.body;
        const macAddress = req.body.mac_address || req.body.router_mac || req.body.mac || req.headers['x-mac-address'] || req.headers['x-router-mac'];
        const currentUser = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
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
        const result = await (0, attendanceActionService_1.executeCheckOutLogic)({ userId, lat, lng, clientIp, macAddress });
        if (!result.success) {
            return res.status(result.statusCode || 400).json({ success: false, message: result.message });
        }
        (0, response_1.SuccessResponse)(res, {
            message: result.message,
            method: verification.method,
            hours: result.hours,
            delay: result.delay,
            departureOnsite: result.departureOnsite
        }, 200);
    }
    catch (error) {
        console.error("Error during check-out:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.checkOut = checkOut;
// 📌 Register or update Passkey (Device password / Passkey)
const registerPasskey = async (req, res) => {
    try {
        const userId = req.user?.id || req.body.userId;
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
        const [user] = await db_1.db
            .select({ id: schema_1.users.id })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .limit(1);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const hashed = await bcrypt_1.default.hash(passkey.trim(), 10);
        await db_1.db
            .update(schema_1.users)
            .set({ passkey: hashed })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        (0, response_1.SuccessResponse)(res, { message: "Passkey registered successfully", registered: true }, 200);
    }
    catch (error) {
        console.error("Error registering passkey:", error);
        res.status(500).json({
            success: false,
            message: error?.message || "Internal Server Error",
        });
    }
};
exports.registerPasskey = registerPasskey;
const getMyAttendanceReport = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const pad = (num) => num.toString().padStart(2, '0');
        let from = req.query.from;
        let to = req.query.to;
        if (!from && !to && req.query.month && req.query.year) {
            const month = parseInt(req.query.month, 10);
            const year = parseInt(req.query.year, 10);
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
            if (!from)
                from = `${year}-${pad(month)}-01`;
            if (!to)
                to = `${year}-${pad(month)}-${pad(lastDay)}`;
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const data = await (0, attendanceService_1.calculateAttendanceReport)(userId, from, to, page, limit);
        (0, response_1.SuccessResponse)(res, data, 200);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getMyAttendanceReport = getMyAttendanceReport;
