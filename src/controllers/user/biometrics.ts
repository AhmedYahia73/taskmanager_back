// src/controllers/user/biometrics.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { users } from "../../models/schema";
import { eq } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import {
  executeCheckInLogic,
  executeCheckOutLogic,
  getOpenAttendanceRecord,
} from "../../services/attendanceActionService";

// Helper to extract client IP reliably (even behind Nginx proxy)
const getClientIp = (req: Request): string => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "";
};

// Euclidean distance calculation for Face Descriptors (128-dimensional vectors)
function euclideanDistance(desc1: number[], desc2: number[]): number {
  if (desc1.length !== desc2.length) return NaN;
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// Helper to safely parse face vector
function parseFaceVector(val: any): number[] | null {
  if (!val) return null;
  let parsed = val;
  while (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  return Array.isArray(parsed) && parsed.length > 0 ? (parsed as number[]) : null;
}

// 📌 1. Register Fingerprint (تسجيل بصمة الإصبع إذا لم تكن موجودة)
export const registerFingerprint = async (req: Request, res: Response) => {
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

    const [user] = await db
      .select({ id: users.id, fingerprint: users.fingerprint })
      .from(users)
      .where(eq(users.id, userId))
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
    await db
      .update(users)
      .set({ fingerprint: fingerprint.trim() })
      .where(eq(users.id, userId));

    SuccessResponse(res, { message: "Fingerprint registered successfully", registered: true }, 200);
  } catch (error) {
    console.error("Error registering fingerprint:", error);
    res.status(500).json({
      success: false,
      message: (error as any)?.message || "Internal Server Error",
    });
  }
};

// 📌 2. Register Face ID (تسجيل بصمة الوجه إذا لم تكن موجودة)
export const registerFaceId = async (req: Request, res: Response) => {
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

    const [user] = await db
      .select({ id: users.id, vector_image_array: users.vector_image_array })
      .from(users)
      .where(eq(users.id, userId))
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
    await db
      .update(users)
      .set({ vector_image_array: vector })
      .where(eq(users.id, userId));

    SuccessResponse(res, { message: "Face ID registered successfully", registered: true }, 200);
  } catch (error) {
    console.error("Error registering Face ID:", error);
    res.status(500).json({
      success: false,
      message: (error as any)?.message || "Internal Server Error",
    });
  }
};

// 📌 3. UNIFIED Biometric Verification (Fingerprint or Face ID) + Attendance (CheckIn / CheckOut)
// يقبل حقل key: "fingerprint" أو "face" لتحديد نوع البصمة
export const verifyBiometric = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.body.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    // Determine biometric type from key, type, or payload
    const rawKey = String(
      req.body.key ||
      req.body.type ||
      req.body.biometric_type ||
      req.body.method ||
      (req.body.fingerprint ? "fingerprint" : (req.body.face_descriptor || req.body.vector_image_array ? "face" : ""))
    ).toLowerCase().trim();

    if (!rawKey || (rawKey !== "fingerprint" && rawKey !== "face" && rawKey !== "face_id")) {
      return res.status(400).json({
        success: false,
        message: "Invalid biometric type. Please send key: 'fingerprint' or 'face' in the request body.",
      });
    }

    const isFingerprint = rawKey === "fingerprint";

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        fingerprint: users.fingerprint,
        vector_image_array: users.vector_image_array,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let biometricMeta: any = {};

    if (isFingerprint) {
      // 🔒 Fingerprint Verification
      const { fingerprint } = req.body;
      if (!fingerprint || typeof fingerprint !== "string" || !fingerprint.trim()) {
        return res.status(400).json({
          success: false,
          message: "Fingerprint payload string is required when key is 'fingerprint'",
        });
      }

      if (!user.fingerprint || !user.fingerprint.trim()) {
        return res.status(404).json({
          success: false,
          valid: false,
          type: "fingerprint",
          message: "No fingerprint registered for this user",
        });
      }

      const isMatch = user.fingerprint.trim() === fingerprint.trim();
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          valid: false,
          type: "fingerprint",
          message: "Fingerprint mismatch. Verification failed.",
        });
      }
    } else {
      // 🔒 Face ID Verification
      const payload = req.body.face_descriptor || req.body.vector_image_array || req.body.payload;
      const sentVector = parseFaceVector(payload);
      if (!sentVector || sentVector.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Valid face descriptor array is required (e.g. 128 numbers) when key is 'face'",
        });
      }

      const savedVector = parseFaceVector(user.vector_image_array);
      if (!savedVector || savedVector.length === 0) {
        return res.status(404).json({
          success: false,
          valid: false,
          type: "face",
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
          type: "face",
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

    // 🔒 Biometric verified successfully! Now process CheckIn / CheckOut attendance
    const action = String(req.body.action || (req.body.key === "verify" ? "verify" : "") || req.query.action || "auto").toLowerCase();
    const biometricTypeName = isFingerprint ? "Fingerprint" : "Face ID";

    if (action === "verify" || action === "verify_only") {
      return SuccessResponse(
        res,
        {
          valid: true,
          type: isFingerprint ? "fingerprint" : "face",
          action: "verify",
          message: `${biometricTypeName} verified successfully`,
          user: { id: user.id, name: user.name },
          ...biometricMeta,
        },
        200
      );
    }

    const lat = req.body.lat !== undefined ? Number(req.body.lat) : undefined;
    const lng = req.body.lng !== undefined ? Number(req.body.lng) : undefined;
    const clientIp = getClientIp(req);

    let result;
    if (action === "checkin" || action === "check_in") {
      result = await executeCheckInLogic({ userId, lat, lng, clientIp });
    } else if (action === "checkout" || action === "check_out") {
      result = await executeCheckOutLogic({ userId, lat, lng, clientIp });
    } else {
      // "auto": If there's an open check-in record, check out; otherwise check in
      const openRecord = await getOpenAttendanceRecord(userId);
      if (openRecord) {
        result = await executeCheckOutLogic({ userId, lat, lng, clientIp });
      } else {
        result = await executeCheckInLogic({ userId, lat, lng, clientIp });
      }
    }

    if (!result.success) {
      return res.status(result.statusCode || 400).json({
        success: false,
        valid: true,
        type: isFingerprint ? "fingerprint" : "face",
        action: result.action,
        message: result.message,
        ...biometricMeta,
      });
    }

    SuccessResponse(
      res,
      {
        valid: true,
        type: isFingerprint ? "fingerprint" : "face",
        action: result.action,
        message: `${biometricTypeName} verified & ${result.message.toLowerCase()}`,
        onsite: result.onsite,
        departureOnsite: result.departureOnsite,
        isRequestOnline: result.isRequestOnline,
        hours: result.hours,
        delay: result.delay,
        user: { id: user.id, name: user.name },
        ...biometricMeta,
      },
      result.statusCode || 200
    );
  } catch (error) {
    console.error("Error in verifyBiometric:", error);
    res.status(500).json({
      success: false,
      message: (error as any)?.message || "Internal Server Error",
    });
  }
};

// Aliases for backwards compatibility
export const verifyFingerprint = async (req: Request, res: Response) => {
  req.body.key = req.body.key || "fingerprint";
  return verifyBiometric(req, res);
};

export const verifyFaceId = async (req: Request, res: Response) => {
  req.body.key = req.body.key || "face";
  return verifyBiometric(req, res);
};

// 📌 4. Biometrics Status (حالة البصمات المسجلة للمستخدم)
export const getBiometricsStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || (req.query.userId as string);

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        fingerprint: users.fingerprint,
        vector_image_array: users.vector_image_array,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const savedVector = parseFaceVector(user.vector_image_array);

    SuccessResponse(
      res,
      {
        has_fingerprint: !!(user.fingerprint && user.fingerprint.trim()),
        has_face_id: !!(savedVector && savedVector.length > 0),
      },
      200
    );
  } catch (error) {
    console.error("Error fetching biometrics status:", error);
    res.status(500).json({
      success: false,
      message: (error as any)?.message || "Internal Server Error",
    });
  }
};
