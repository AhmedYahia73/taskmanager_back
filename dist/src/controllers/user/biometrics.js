"use strict";
// src/controllers/user/biometrics.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBiometricsStatus = exports.verifyFaceId = exports.verifyFingerprint = exports.registerFaceId = exports.registerFingerprint = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
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
                message: "Valid fingerprint string/token payload is required",
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
        const payload = req.body.face_descriptor || req.body.vector_image_array || req.body.payload;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        const vector = parseFaceVector(payload);
        if (!vector || vector.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Valid face descriptor array is required (e.g. 128 numbers)",
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
// 📌 3. Verify Fingerprint (التحقق من صحة بصمة الإصبع)
const verifyFingerprint = async (req, res) => {
    try {
        const userId = req.user?.id || req.body.userId;
        const { fingerprint } = req.body;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        if (!fingerprint || typeof fingerprint !== "string") {
            return res.status(400).json({ success: false, message: "Fingerprint payload is required" });
        }
        const [user] = await db_1.db
            .select({ id: schema_1.users.id, name: schema_1.users.name, fingerprint: schema_1.users.fingerprint })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .limit(1);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        if (!user.fingerprint || !user.fingerprint.trim()) {
            return res.status(404).json({
                success: false,
                valid: false,
                message: "No fingerprint registered for this user",
            });
        }
        const isMatch = user.fingerprint.trim() === fingerprint.trim();
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                valid: false,
                message: "Fingerprint mismatch. Verification failed.",
            });
        }
        (0, response_1.SuccessResponse)(res, {
            valid: true,
            message: "Fingerprint verified successfully",
            user: { id: user.id, name: user.name },
        }, 200);
    }
    catch (error) {
        console.error("Error verifying fingerprint:", error);
        res.status(500).json({
            success: false,
            message: error?.message || "Internal Server Error",
        });
    }
};
exports.verifyFingerprint = verifyFingerprint;
// 📌 4. Verify Face ID (التحقق من صحة بصمة الوجه)
const verifyFaceId = async (req, res) => {
    try {
        const userId = req.user?.id || req.body.userId;
        const payload = req.body.face_descriptor || req.body.vector_image_array || req.body.payload;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        const sentVector = parseFaceVector(payload);
        if (!sentVector || sentVector.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Valid face descriptor array is required for verification",
            });
        }
        const [user] = await db_1.db
            .select({ id: schema_1.users.id, name: schema_1.users.name, vector_image_array: schema_1.users.vector_image_array })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .limit(1);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const savedVector = parseFaceVector(user.vector_image_array);
        if (!savedVector || savedVector.length === 0) {
            return res.status(404).json({
                success: false,
                valid: false,
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
                distance: Number(distance.toFixed(4)),
                threshold,
                message: "Face ID mismatch. Verification failed.",
            });
        }
        (0, response_1.SuccessResponse)(res, {
            valid: true,
            distance: Number(distance.toFixed(4)),
            score: Number((1 - Math.min(distance, 1)).toFixed(4)),
            threshold,
            message: "Face ID verified successfully",
            user: { id: user.id, name: user.name },
        }, 200);
    }
    catch (error) {
        console.error("Error verifying Face ID:", error);
        res.status(500).json({
            success: false,
            message: error?.message || "Internal Server Error",
        });
    }
};
exports.verifyFaceId = verifyFaceId;
// 📌 5. Biometrics Status (حالة البصمات المسجلة للمستخدم)
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
