// src/routes/user/biometrics.ts

import { Router, Request, Response, NextFunction } from "express";
import {
  registerFingerprint,
  registerFaceId,
  verifyBiometric,
  verifyFingerprint,
  verifyFaceId,
  getBiometricsStatus,
  getIP
} from "../../controllers/user/biometrics";
import { catchAsync } from "../../utils/catchAsync";
import { verifyToken } from "../../utils/auth";

const route = Router();

// Middleware that extracts user from token if available, but doesn't block if userId is passed in body
const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = verifyToken(token);
      req.user = decoded;
    } catch (e) {
      // Token expired or invalid, continue so body.userId can be checked
    }
  }
  next();
};

route.use(optionalAuth);

// 📌 1. Register Fingerprint (تسجيل بصمة الإصبع)
route.post("/fingerprint/register", catchAsync(registerFingerprint));

// 📌 2. Register Face ID (تسجيل بصمة الوجه)
route.post("/face/register", catchAsync(registerFaceId));

// 📌 3. Unified Biometric Verification (بصمة إصبع أو وجه عبر key: "fingerprint" | "face") + Attendance
route.post("/verify", catchAsync(verifyBiometric));

// Backwards compatibility aliases
route.post("/fingerprint/verify", catchAsync(verifyFingerprint));
route.post("/face/verify", catchAsync(verifyFaceId));

// 📌 4. Check Biometrics Status (فحص البصمات المسجلة للموظف)
route.get("/status", catchAsync(getBiometricsStatus));
route.get("/ip", catchAsync(getIP));

export default route;
