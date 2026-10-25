"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyAttendanceReport = exports.checkOut = exports.checkIn = exports.getAttendanceStatus = void 0;
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
const getClientIp = (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
        return forwarded.split(",")[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || "";
};
const getAttendanceStatus = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const sysSettings = await db_1.db.select().from(schema_1.settings).limit(1);
        const systemSettings = sysSettings[0] || {};
        const attendanceSettings = {
            face_id: true,
            router_ip_status: systemSettings.router_ip_status ?? false
        };
        const openRecords = await db_1.db.select().from(schema_1.attendance)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendance.userId, userId), (0, drizzle_orm_1.isNull)(schema_1.attendance.to)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.attendance.from))
            .limit(1);
        if (openRecords.length > 0) {
            return (0, response_1.SuccessResponse)(res, { isCheckedIn: true, record: openRecords[0], settings: attendanceSettings }, 200);
        }
        return (0, response_1.SuccessResponse)(res, { isCheckedIn: false, record: null, settings: attendanceSettings }, 200);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getAttendanceStatus = getAttendanceStatus;
const checkIn = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const { lat, lng, payload } = req.body;
        const currentUser = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
        if (!currentUser.length) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        // 🔒 Validate Face ID
        if (!payload || !Array.isArray(payload) || payload.length !== 128) {
            return res.status(400).json({ success: false, message: "Invalid Face ID payload." });
        }
        const savedVectorStr = currentUser[0]?.vector_image_array;
        if (!savedVectorStr) {
            return res.status(403).json({ success: false, message: "No Face ID registered for this user." });
        }
        let savedVector = [];
        try {
            let parsed = savedVectorStr;
            while (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
            }
            savedVector = parsed;
        }
        catch (e) {
            return res.status(500).json({ success: false, message: "Corrupted Face ID data." });
        }
        if (!Array.isArray(savedVector) || savedVector.length !== 128) {
            return res.status(500).json({ success: false, message: `Invalid saved Face ID data.` });
        }
        const distance = euclideanDistance(payload, savedVector);
        console.log(`[Face ID CheckIn] User: ${userId} | Distance: ${distance.toFixed(4)}`);
        if (isNaN(distance) || distance > 0.6) {
            return res.status(403).json({ success: false, message: `Face ID mismatch. Verification failed. (Score: ${isNaN(distance) ? 'Invalid' : distance.toFixed(4)})` });
        }
        const clientIp = getClientIp(req);
        const result = await (0, attendanceActionService_1.executeCheckInLogic)({ userId, lat, lng, clientIp });
        if (!result.success) {
            return res.status(result.statusCode || 400).json({ success: false, message: result.message });
        }
        (0, response_1.SuccessResponse)(res, { message: result.message, onsite: result.onsite, isRequestOnline: result.isRequestOnline }, 201);
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
        const { lat, lng, payload } = req.body;
        const currentUser = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
        if (!currentUser.length) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        // 🔒 Validate Face ID
        if (!payload || !Array.isArray(payload) || payload.length !== 128) {
            return res.status(400).json({ success: false, message: "Invalid Face ID payload." });
        }
        const savedVectorStr = currentUser[0]?.vector_image_array;
        if (!savedVectorStr) {
            return res.status(403).json({ success: false, message: "No Face ID registered for this user." });
        }
        let savedVector = [];
        try {
            let parsed = savedVectorStr;
            while (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
            }
            savedVector = parsed;
        }
        catch (e) {
            return res.status(500).json({ success: false, message: "Corrupted Face ID data." });
        }
        if (!Array.isArray(savedVector) || savedVector.length !== 128) {
            return res.status(500).json({ success: false, message: `Invalid saved Face ID data.` });
        }
        const distance = euclideanDistance(payload, savedVector);
        console.log(`[Face ID CheckOut] User: ${userId} | Distance: ${distance.toFixed(4)}`);
        if (isNaN(distance) || distance > 0.6) {
            return res.status(403).json({ success: false, message: `Face ID mismatch. Verification failed. (Score: ${isNaN(distance) ? 'Invalid' : distance.toFixed(4)})` });
        }
        const clientIp = getClientIp(req);
        const result = await (0, attendanceActionService_1.executeCheckOutLogic)({ userId, lat, lng, clientIp });
        if (!result.success) {
            return res.status(result.statusCode || 400).json({ success: false, message: result.message });
        }
        (0, response_1.SuccessResponse)(res, { message: result.message, hours: result.hours, delay: result.delay }, 200);
    }
    catch (error) {
        console.error("Error during check-out:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.checkOut = checkOut;
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
