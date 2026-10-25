"use strict";
// src/routes/user/biometrics.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const biometrics_1 = require("../../controllers/user/biometrics");
const catchAsync_1 = require("../../utils/catchAsync");
const auth_1 = require("../../utils/auth");
const route = (0, express_1.Router)();
// Middleware that extracts user from token if available, but doesn't block if userId is passed in body
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
            const token = authHeader.split(" ")[1];
            const decoded = (0, auth_1.verifyToken)(token);
            req.user = decoded;
        }
        catch (e) {
            // Token expired or invalid, continue so body.userId can be checked
        }
    }
    next();
};
route.use(optionalAuth);
// 📌 1. Register Fingerprint (تسجيل بصمة الإصبع)
route.post("/fingerprint/register", (0, catchAsync_1.catchAsync)(biometrics_1.registerFingerprint));
// 📌 2. Register Face ID (تسجيل بصمة الوجه)
route.post("/face/register", (0, catchAsync_1.catchAsync)(biometrics_1.registerFaceId));
// 📌 3. Unified Biometric Verification (بصمة إصبع أو وجه عبر key: "fingerprint" | "face") + Attendance
route.post("/verify", (0, catchAsync_1.catchAsync)(biometrics_1.verifyBiometric));
// Backwards compatibility aliases
route.post("/fingerprint/verify", (0, catchAsync_1.catchAsync)(biometrics_1.verifyFingerprint));
route.post("/face/verify", (0, catchAsync_1.catchAsync)(biometrics_1.verifyFaceId));
// 📌 4. Check Biometrics Status (فحص البصمات المسجلة للموظف)
route.get("/status", (0, catchAsync_1.catchAsync)(biometrics_1.getBiometricsStatus));
exports.default = route;
