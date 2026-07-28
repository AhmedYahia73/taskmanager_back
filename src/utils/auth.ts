// src/utils/auth.ts

import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../Errors";
import { TokenPayload } from "../types/custom";
import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET as string;
 

// ✅ دالة عامة لتوليد التوكن بناءً على الدور القادم ديناميكياً من قاعدة البيانات
export const generateUserToken = (data: {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "super_admin" | "admin" | "tester" | "engineer";
}): string => {
  const payload: TokenPayload = {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};

// 🛡️ التحقق من صحة الـ Token وفك تشفيره
export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new UnauthorizedError("Invalid token");
  }
};