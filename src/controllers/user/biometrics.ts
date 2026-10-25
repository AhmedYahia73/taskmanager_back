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

// 📌 3. Verify Fingerprint + Register Attendance (تحقق من بصمة الإصبع وتسجيل حضور/انصراف)
export const verifyFingerprint = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const { fingerprint } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!fingerprint || typeof fingerprint !== "string") {
      return res.status(400).json({ success: false, message: "Fingerprint payload is required" });
    }

    const [user] = await db
      .select({ id: users.id, name: users.name, fingerprint: users.fingerprint })
      .from(users)
      .where(eq(users.id, userId))
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

    // 🔒 Biometric is valid! Now process CheckIn / CheckOut attendance action
    const action = String(req.body.action || req.body.type || req.query.action || "auto").toLowerCase();

    // If caller only wants verification without touching attendance records
    if (action === "verify" || action === "verify_only") {
      return SuccessResponse(
        res,
        {
          valid: true,
          action: "verify",
          message: "Fingerprint verified successfully",
          user: { id: user.id, name: user.name },
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
        valid: true, // Verification passed, but attendance failed (e.g. invalid router IP or no open check-in)
        action: result.action,
        message: result.message,
      });
    }

    SuccessResponse(
      res,
      {
        valid: true,
        action: result.action,
        message: `Fingerprint verified & ${result.message.toLowerCase()}`,
        onsite: result.onsite,
        departureOnsite: result.departureOnsite,
        isRequestOnline: result.isRequestOnline,
        hours: result.hours,
        delay: result.delay,
        user: { id: user.id, name: user.name },
      },
      result.statusCode || 200
    );
  } catch (error) {
    console.error("Error verifying fingerprint:", error);
    res.status(500).json({
      success: false,
      message: (error as any)?.message || "Internal Server Error",
    });
  }
};

// 📌 4. Verify Face ID + Register Attendance (تحقق من بصمة الوجه وتسجيل حضور/انصراف)
export const verifyFaceId = async (req: Request, res: Response) => {
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

    const [user] = await db
      .select({ id: users.id, name: users.name, vector_image_array: users.vector_image_array })
      .from(users)
      .where(eq(users.id, userId))
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

    // 🔒 Face ID is valid! Now process CheckIn / CheckOut attendance action
    const action = String(req.body.action || req.body.type || req.query.action || "auto").toLowerCase();

    // If caller only wants verification without touching attendance records
    if (action === "verify" || action === "verify_only") {
      return SuccessResponse(
        res,
        {
          valid: true,
          action: "verify",
          distance: Number(distance.toFixed(4)),
          score: Number((1 - Math.min(distance, 1)).toFixed(4)),
          threshold,
          message: "Face ID verified successfully",
          user: { id: user.id, name: user.name },
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
        valid: true, // Face ID matched, but attendance action failed
        action: result.action,
        distance: Number(distance.toFixed(4)),
        score: Number((1 - Math.min(distance, 1)).toFixed(4)),
        threshold,
        message: result.message,
      });
    }

    SuccessResponse(
      res,
      {
        valid: true,
        action: result.action,
        message: `Face ID verified & ${result.message.toLowerCase()}`,
        distance: Number(distance.toFixed(4)),
        score: Number((1 - Math.min(distance, 1)).toFixed(4)),
        threshold,
        onsite: result.onsite,
        departureOnsite: result.departureOnsite,
        isRequestOnline: result.isRequestOnline,
        hours: result.hours,
        delay: result.delay,
        user: { id: user.id, name: user.name },
      },
      result.statusCode || 200
    );
  } catch (error) {
    console.error("Error verifying Face ID:", error);
    res.status(500).json({
      success: false,
      message: (error as any)?.message || "Internal Server Error",
    });
  }
};

// 📌 5. Biometrics Status (حالة البصمات المسجلة للمستخدم)
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
