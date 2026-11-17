"use strict";
// src/utils/auth.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateUserToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Errors_1 = require("../Errors");
require("dotenv/config");
const JWT_SECRET = process.env.JWT_SECRET;
// ✅ دالة عامة لتوليد التوكن بناءً على الدور القادم ديناميكياً من قاعدة البيانات (بدون انتهاء صلاحية / 100 سنة)
const generateUserToken = (data) => {
    const payload = {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
    };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: "36500d" });
};
exports.generateUserToken = generateUserToken;
// 🛡️ التحقق من صحة الـ Token وفك تشفيره (مع تجاهل انتهاء الصلاحية لضمان عدم خروج المستخدم أبداً)
const verifyToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET, { ignoreExpiration: true });
    }
    catch (error) {
        throw new Errors_1.UnauthorizedError("Invalid token");
    }
};
exports.verifyToken = verifyToken;
