"use strict";
// src/controllers/user/biometrics.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBiometricsStatus = exports.verifyFaceId = exports.verifyFingerprint = exports.verifyBiometric = exports.registerFaceId = exports.registerFingerprint = exports.getIP = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const attendanceActionService_1 = require("../../services/attendanceActionService");
// Helper to extract client IP reliably (even behind Nginx proxy)
const getClientIp = (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
        return forwarded.split(",")[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || "";
};
// Euclidean distance calculation for Face Descriptors (128-dimensional vectors)
function euclideanDistance(desc1, desc2) {
    if (desc1.length !== desc2.length)
        return NaN;
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
        const diff = desc1[i] - desc2[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}
// Helper to safely parse face vector
function parseFaceVector(val) {
    if (!val)
        return null;
    let parsed = val;
    while (typeof parsed === "string") {
        try {
            parsed = JSON.parse(parsed);
        }
        catch {
            return null;
        }
    }
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
}
const getIP = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        const [user] = await db_1.db
            .select({ id: schema_1.users.id, zones: schema_1.zones })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .leftJoin(schema_1.zones, (0, drizzle_orm_1.eq)(schema_1.users.zone_id, schema_1.zones.id))
            .limit(1);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const zone = user.zones;
        let data = {
            router_ip: zone?.router_ip || null,
            router_ip_status: zone?.router_ip_status || null,
        };
        (0, response_1.SuccessResponse)(res, { message: "IP address retrieved ", data }, 200);
    }
    catch (error) {
        console.error("Error: ", error);
        res.status(500).json({
            success: false,
            message: error?.message || "Internal Server Error",
        });
    }
};
exports.getIP = getIP;
// 📌 1. Register Fingerprint (تسجيل بصمة الإصبع إذا لم تكن موجودة)
const registerFingerprint = async (req, res) => {
    try {
        const userId = req.user?.id || req.body.userId;
        const { fingerprint } = req.body;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        if (!fingerprint || typeof fingerprint !== "string" || !fingerprint.trim()) {
            return res.status(400).json({
                success: false,
                message: "Valid fingerprint string payload is required",
            });
        }
        const [user] = await db_1.db
            .select({ id: schema_1.users.id, fingerprint: schema_1.users.fingerprint })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .limit(1);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        // Check if fingerprint already registered
        if (user.fingerprint && user.fingerprint.trim()) {
            return res.status(400).json({
                success: false,
                message: "Fingerprint is already registered for this user",
                alreadyRegistered: true,
            });
        }
        // Save fingerprint
        await db_1.db
            .update(schema_1.users)
            .set({ fingerprint: fingerprint.trim() })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        (0, response_1.SuccessResponse)(res, { message: "Fingerprint registered successfully", registered: true }, 200);
    }
    catch (error) {
        console.error("Error registering fingerprint:", error);
        res.status(500).json({
            success: false,
            message: error?.message || "Internal Server Error",
        });
    }
};
exports.registerFingerprint = registerFingerprint;
// 📌 2. Register Face ID (تسجيل بصمة الوجه إذا لم تكن موجودة)
const registerFaceId = async (req, res) => {
    try {
        const userId = req.user?.id || req.body.userId;
        const payload = req.body.payload || req.body.face_descriptor || req.body.vector_image_array;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        const vector = parseFaceVector(payload);
        if (!vector || vector.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Valid face descriptor array is required (128 numbers)",
            });
        }
        const [user] = await db_1.db
            .select({ id: schema_1.users.id, vector_image_array: schema_1.users.vector_image_array })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .limit(1);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        // Check if face ID already registered
        const existingVector = parseFaceVector(user.vector_image_array);
        if (existingVector && existingVector.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Face ID is already registered for this user",
                alreadyRegistered: true,
            });
        }
        // Save Face ID vector
        await db_1.db
            .update(schema_1.users)
            .set({ vector_image_array: vector })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        (0, response_1.SuccessResponse)(res, { message: "Face ID registered successfully", registered: true }, 200);
    }
    catch (error) {
        console.error("Error registering Face ID:", error);
        res.status(500).json({
            success: false,
            message: error?.message || "Internal Server Error",
        });
    }
};
exports.registerFaceId = registerFaceId;
// 📌 3. UNIFIED Biometric Verification (Fingerprint or Face ID) + Attendance (CheckIn / CheckOut)
// Body Parameters:
// - key: "fingerprint" | "face" (إلزامي)
// - payload: string (for fingerprint) | array of numbers (for face) (إلزامي)
// - action: "checkin" | "checkout" (اختياري، افتراضياً: auto)
// - lat, lng: numbers (اختياري)
// - userId: UUID (اختياري عند وجود Bearer Token)
const verifyBiometric = async (req, res) => {
    try {
        const userId = req.user?.id || req.body.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        const key = req.body.key ? String(req.body.key).toLowerCase().trim() : "";
        if (!key || (key !== "fingerprint" && key !== "face")) {
            return res.status(400).json({
                success: false,
                message: "Invalid or missing 'key'. Must be 'fingerprint' or 'face'",
            });
        }
        // Extract payload (accepts payload, or fallback to fingerprint / face_descriptor)
        const payload = req.body.payload ?? (key === "fingerprint" ? req.body.fingerprint : req.body.face_descriptor);
        if (!payload) {
            return res.status(400).json({
                success: false,
                message: "Field 'payload' is required",
            });
        }
        const isFingerprint = key === "fingerprint";
        const [user] = await db_1.db
            .select({
            id: schema_1.users.id,
            name: schema_1.users.name,
            fingerprint: schema_1.users.fingerprint,
            vector_image_array: schema_1.users.vector_image_array,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .limit(1);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        let biometricMeta = {};
        if (isFingerprint) {
            // 🔒 Fingerprint verification
            if (typeof payload !== "string" || !payload.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "'payload' must be a valid fingerprint string",
                });
            }
            if (!user.fingerprint || !user.fingerprint.trim()) {
                return res.status(404).json({
                    success: false,
                    valid: false,
                    key: "fingerprint",
                    message: "No fingerprint registered for this user",
                });
            }
            const isMatch = user.fingerprint.trim() === payload.trim();
            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    valid: false,
                    key: "fingerprint",
                    message: "Fingerprint mismatch. Verification failed.",
                });
            }
        }
        else {
            // 🔒 Face ID verification
            const sentVector = parseFaceVector(payload);
            if (!sentVector || sentVector.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "'payload' must be an array of numbers representing face coordinates (128 floats)",
                });
            }
            const savedVector = parseFaceVector(user.vector_image_array);
            if (!savedVector || savedVector.length === 0) {
                return res.status(404).json({
                    success: false,
                    valid: false,
                    key: "face",
                    message: "No Face ID registered for this user",
                });
            }
            const distance = euclideanDistance(sentVector, savedVector);
            const threshold = req.body.threshold ? Number(req.body.threshold) : 0.6;
            const isMatch = !isNaN(distance) && distance <= threshold;
            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    valid: false,
                    key: "face",
                    distance: Number(distance.toFixed(4)),
                    threshold,
                    message: "Face ID mismatch. Verification failed.",
                });
            }
            biometricMeta = {
                distance: Number(distance.toFixed(4)),
                score: Number((1 - Math.min(distance, 1)).toFixed(4)),
                threshold,
            };
        }
        // 🔒 Biometric verified successfully! Process attendance (Check-In / Check-Out)
        const action = String(req.body.action || "auto").toLowerCase();
        const biometricLabel = isFingerprint ? "Fingerprint" : "Face ID";
        if (action === "verify" || action === "verify_only") {
            return (0, response_1.SuccessResponse)(res, {
                valid: true,
                key,
                action: "verify",
                message: `${biometricLabel} verified successfully`,
                user: { id: user.id, name: user.name },
                ...biometricMeta,
            }, 200);
        }
        const lat = req.body.lat !== undefined ? Number(req.body.lat) : undefined;
        const lng = req.body.lng !== undefined ? Number(req.body.lng) : undefined;
        const clientIp = getClientIp(req);
        let result;
        if (action === "checkin" || action === "check_in") {
            result = await (0, attendanceActionService_1.executeCheckInLogic)({ userId, lat, lng, clientIp });
        }
        else if (action === "checkout" || action === "check_out") {
            result = await (0, attendanceActionService_1.executeCheckOutLogic)({ userId, lat, lng, clientIp });
        }
        else {
            // "auto": If there's an open check-in record, check out; otherwise check in
            const openRecord = await (0, attendanceActionService_1.getOpenAttendanceRecord)(userId);
            if (openRecord) {
                result = await (0, attendanceActionService_1.executeCheckOutLogic)({ userId, lat, lng, clientIp });
            }
            else {
                result = await (0, attendanceActionService_1.executeCheckInLogic)({ userId, lat, lng, clientIp });
            }
        }
        if (!result.success) {
            return res.status(result.statusCode || 400).json({
                success: false,
                valid: true,
                key,
                action: result.action,
                message: result.message,
                ...biometricMeta,
            });
        }
        (0, response_1.SuccessResponse)(res, {
            valid: true,
            key,
            action: result.action,
            message: `${biometricLabel} verified & ${result.message.toLowerCase()}`,
            onsite: result.onsite,
            departureOnsite: result.departureOnsite,
            isRequestOnline: result.isRequestOnline,
            hours: result.hours,
            delay: result.delay,
            user: { id: user.id, name: user.name },
            ...biometricMeta,
        }, result.statusCode || 200);
    }
    catch (error) {
        console.error("Error in verifyBiometric:", error);
        res.status(500).json({
            success: false,
            message: error?.message || "Internal Server Error",
        });
    }
};
exports.verifyBiometric = verifyBiometric;
// Aliases for backwards compatibility
const verifyFingerprint = async (req, res) => {
    req.body.key = "fingerprint";
    return (0, exports.verifyBiometric)(req, res);
};
exports.verifyFingerprint = verifyFingerprint;
const verifyFaceId = async (req, res) => {
    req.body.key = "face";
    return (0, exports.verifyBiometric)(req, res);
};
exports.verifyFaceId = verifyFaceId;
// 📌 4. Biometrics Status (حالة البصمات المسجلة للمستخدم)
const getBiometricsStatus = async (req, res) => {
    try {
        const userId = req.user?.id || req.query.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        const [user] = await db_1.db
            .select({
            id: schema_1.users.id,
            name: schema_1.users.name,
            fingerprint: schema_1.users.fingerprint,
            vector_image_array: schema_1.users.vector_image_array,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .limit(1);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const savedVector = parseFaceVector(user.vector_image_array);
        (0, response_1.SuccessResponse)(res, {
            has_fingerprint: !!(user.fingerprint && user.fingerprint.trim()),
            has_face_id: !!(savedVector && savedVector.length > 0),
        }, 200);
    }
    catch (error) {
        console.error("Error fetching biometrics status:", error);
        res.status(500).json({
            success: false,
            message: error?.message || "Internal Server Error",
        });
    }
};
exports.getBiometricsStatus = getBiometricsStatus;
