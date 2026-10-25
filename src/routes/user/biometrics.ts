// src/routes/user/biometrics.ts

import { Router, Request, Response, NextFunction } from "express";
import {
  registerFingerprint,
  registerFaceId,
  verifyFingerprint,
  verifyFaceId,
  getBiometricsStatus,
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

// 📌 3. Verify Fingerprint (التحقق من بصمة الإصبع وتسجيل checkin أو checkout)
route.post("/fingerprint/verify", catchAsync(verifyFingerprint));

// 📌 4. Verify Face ID (التحقق من بصمة الوجه وتسجيل checkin أو checkout)
route.post("/face/verify", catchAsync(verifyFaceId));

// 📌 5. Check Biometrics Status (فحص البصمات المسجلة للموظف)
route.get("/status", catchAsync(getBiometricsStatus));

export default route;
