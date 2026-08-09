"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyAttendanceReport = exports.checkOut = exports.checkIn = exports.getAttendanceStatus = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const attendanceService_1 = require("../../services/attendanceService");
function isPointInPolygon(lat, lng, polygon) {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const x_i = polygon[i][0], y_i = polygon[i][1];
        const x_j = polygon[j][0], y_j = polygon[j][1];
        const intersect = ((y_i > lng) !== (y_j > lng)) && (lat < (x_j - x_i) * (lng - y_i) / (y_j - y_i) + x_i);
        if (intersect)
            isInside = !isInside;
    }
    return isInside;
}
function euclideanDistance(desc1, desc2) {
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
        const diff = desc1[i] - desc2[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}
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
        const zoneId = currentUser[0]?.zone_id;
        let locations = [];
        if (zoneId) {
            const userZone = await db_1.db.select().from(schema_1.zones).where((0, drizzle_orm_1.eq)(schema_1.zones.id, zoneId)).limit(1);
            locations = userZone[0]?.locations || [];
            if (typeof locations === 'string') {
                try {
                    locations = JSON.parse(locations);
                }
                catch (e) {
                    locations = [];
                }
            }
        }
        const sysSettings = await db_1.db.select().from(schema_1.settings).limit(1);
        const systemSettings = sysSettings[0];
        // 🔒 Always validate Face ID; also validate Router IP if enabled
        if (systemSettings?.router_ip_status) {
            let userIp = req.ip || req.socket.remoteAddress || "";
            if (userIp === "::1" || userIp === "::ffff:127.0.0.1")
                userIp = "127.0.0.1";
            if (userIp !== systemSettings.router_ip) {
                return res.status(403).json({ success: false, message: "Invalid Router IP. Please connect to the correct network." });
            }
        }
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
            // Handle double-stringified JSON (old data)
            while (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
            }
            savedVector = parsed;
        }
        catch (e) {
            return res.status(500).json({ success: false, message: "Corrupted Face ID data." });
        }
        if (!Array.isArray(savedVector) || savedVector.length !== 128) {
            return res.status(500).json({ success: false, message: `Invalid saved Face ID data. (type: ${typeof savedVector}, length: ${Array.isArray(savedVector) ? savedVector.length : 'N/A'})` });
        }
        const distance = euclideanDistance(payload, savedVector);
        console.log(`[Face ID CheckIn] User: ${userId} | Distance: ${distance.toFixed(4)} | Saved vector length: ${savedVector.length} | Payload length: ${payload.length}`);
        if (isNaN(distance) || distance > 0.6) {
            return res.status(403).json({ success: false, message: `Face ID mismatch. Verification failed. (Score: ${isNaN(distance) ? 'Invalid' : distance.toFixed(4)})` });
        }
        let onlineDays = systemSettings?.online_days || [];
        if (typeof onlineDays === 'string') {
            try {
                onlineDays = JSON.parse(onlineDays);
            }
            catch (e) {
                onlineDays = [];
            }
        }
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDayName = daysOfWeek[new Date().getDay()];
        const isOnlineDay = Array.isArray(onlineDays) && onlineDays.includes(currentDayName.toLowerCase());
        let onsite = false;
        if (lat !== undefined && lng !== undefined && Array.isArray(locations) && locations.length >= 3) {
            if (isPointInPolygon(lat, lng, locations)) {
                onsite = true;
            }
        }
        let isRequestOnline = false;
        if (isOnlineDay) {
            isRequestOnline = true;
            onsite = false;
        }
        else if (!onsite) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);
            const requests = await db_1.db.select().from(schema_1.onlineRequests)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.onlineRequests.userId, userId), (0, drizzle_orm_1.eq)(schema_1.onlineRequests.status, "approve"), (0, drizzle_orm_1.gte)(schema_1.onlineRequests.date, todayStart), (0, drizzle_orm_1.lte)(schema_1.onlineRequests.date, todayEnd)));
            if (requests.length > 0) {
                isRequestOnline = true;
            }
        }
        await db_1.db.insert(schema_1.attendance).values({
            userId,
            from: new Date(),
            onsite,
            isRequestOnline
        });
        (0, response_1.SuccessResponse)(res, { message: "Checked in successfully", onsite, isRequestOnline }, 201);
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
        const openRecords = await db_1.db.select().from(schema_1.attendance)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendance.userId, userId), (0, drizzle_orm_1.isNull)(schema_1.attendance.to)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.attendance.from))
            .limit(1);
        if (openRecords.length === 0) {
            return res.status(400).json({ success: false, message: "No active check-in found." });
        }
        const record = openRecords[0];
        const toDate = new Date();
        const currentUser = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
        const sysSettings = await db_1.db.select().from(schema_1.settings).limit(1);
        const systemSettings = sysSettings[0];
        // 🔒 Always validate Face ID; also validate Router IP if enabled
        if (systemSettings?.router_ip_status) {
            let userIp = req.ip || req.socket.remoteAddress || "";
            if (userIp === "::1" || userIp === "::ffff:127.0.0.1")
                userIp = "127.0.0.1";
            if (userIp !== systemSettings.router_ip) {
                return res.status(403).json({ success: false, message: "Invalid Router IP. Please connect to the correct network." });
            }
        }
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
            // Handle double-stringified JSON (old data)
            while (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
            }
            savedVector = parsed;
        }
        catch (e) {
            return res.status(500).json({ success: false, message: "Corrupted Face ID data." });
        }
        if (!Array.isArray(savedVector) || savedVector.length !== 128) {
            return res.status(500).json({ success: false, message: `Invalid saved Face ID data. (type: ${typeof savedVector}, length: ${Array.isArray(savedVector) ? savedVector.length : 'N/A'})` });
        }
        const distance = euclideanDistance(payload, savedVector);
        console.log(`[Face ID CheckOut] User: ${userId} | Distance: ${distance.toFixed(4)} | Saved vector length: ${savedVector.length} | Payload length: ${payload.length}`);
        if (isNaN(distance) || distance > 0.6) {
            return res.status(403).json({ success: false, message: `Face ID mismatch. Verification failed. (Score: ${isNaN(distance) ? 'Invalid' : distance.toFixed(4)})` });
        }
        const zoneId = currentUser[0]?.zone_id;
        const shiftId = currentUser[0]?.shift_id;
        let locations = [];
        if (zoneId) {
            const userZone = await db_1.db.select().from(schema_1.zones).where((0, drizzle_orm_1.eq)(schema_1.zones.id, zoneId)).limit(1);
            locations = userZone[0]?.locations || [];
            if (typeof locations === 'string') {
                try {
                    locations = JSON.parse(locations);
                }
                catch (e) {
                    locations = [];
                }
            }
        }
        let departureOnsite = false;
        if (lat !== undefined && lng !== undefined && Array.isArray(locations) && locations.length >= 3) {
            if (isPointInPolygon(lat, lng, locations)) {
                departureOnsite = true;
            }
        }
        const recordFromDate = new Date(record.from);
        const diffMs = toDate.getTime() - recordFromDate.getTime();
        let workedHours = diffMs / (1000 * 60 * 60);
        let delay = 0;
        let earlyLeave = 0;
        const delayPermissionMinutes = systemSettings?.delay_premission_minutes || 0;
        let userShift = null;
        if (shiftId) {
            const fetchedShift = await db_1.db.select().from(schema_1.shifts).where((0, drizzle_orm_1.eq)(schema_1.shifts.id, shiftId)).limit(1);
            userShift = fetchedShift[0];
        }
        if (userShift && userShift.days) {
            let daysData = userShift.days;
            if (typeof daysData === 'string') {
                try {
                    daysData = JSON.parse(daysData);
                }
                catch (e) {
                    daysData = {};
                }
            }
            const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const currentDayStr = daysOfWeek[recordFromDate.getDay()];
            const todayShift = daysData[currentDayStr];
            if (todayShift && todayShift.active && todayShift.from && todayShift.to) {
                const [shiftFromH, shiftFromM] = todayShift.from.split(':').map(Number);
                const [shiftToH, shiftToM] = todayShift.to.split(':').map(Number);
                const expectedStart = new Date(recordFromDate);
                expectedStart.setHours(shiftFromH, shiftFromM, 0, 0);
                let expectedEnd = new Date(recordFromDate);
                expectedEnd.setHours(shiftToH, shiftToM, 0, 0);
                if (expectedEnd.getTime() < expectedStart.getTime()) {
                    expectedEnd.setDate(expectedEnd.getDate() + 1);
                }
                const requiredHours = (expectedEnd.getTime() - expectedStart.getTime()) / (1000 * 60 * 60);
                if (record.isRequestOnline || !record.onsite) {
                    // Online mode: flexible hours, delay is just shortage of total hours
                    if (workedHours < requiredHours) {
                        delay = requiredHours - workedHours;
                    }
                }
                else {
                    const lateMs = recordFromDate.getTime() - expectedStart.getTime();
                    if (lateMs > 0) {
                        const lateMinutes = lateMs / (1000 * 60);
                        if (lateMinutes > delayPermissionMinutes) {
                            delay += lateMs / (1000 * 60 * 60);
                        }
                    }
                    const earlyMs = expectedEnd.getTime() - toDate.getTime();
                    if (earlyMs > 0) {
                        earlyLeave = earlyMs / (1000 * 60 * 60);
                    }
                }
            }
        }
        const todayStart = new Date(recordFromDate);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(recordFromDate);
        todayEnd.setHours(23, 59, 59, 999);
        const permRecords = await db_1.db.select().from(schema_1.permissions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.permissions.userId, userId), (0, drizzle_orm_1.eq)(schema_1.permissions.status, "approve"), (0, drizzle_orm_1.gte)(schema_1.permissions.date, todayStart), (0, drizzle_orm_1.lte)(schema_1.permissions.date, todayEnd)));
        let totalPenalty = delay + earlyLeave;
        let permissionHoursCovered = 0;
        for (const p of permRecords) {
            permissionHoursCovered += p.hours;
        }
        if (totalPenalty > 0 && permissionHoursCovered > 0) {
            if (permissionHoursCovered >= totalPenalty) {
                totalPenalty = 0;
            }
            else {
                totalPenalty -= permissionHoursCovered;
            }
        }
        await db_1.db.update(schema_1.attendance).set({
            to: toDate,
            departureOnsite,
            hours: workedHours,
            delay: totalPenalty
        }).where((0, drizzle_orm_1.eq)(schema_1.attendance.id, record.id));
        (0, response_1.SuccessResponse)(res, { message: "Checked out successfully", hours: workedHours, delay: totalPenalty }, 200);
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
        const from = req.query.from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const to = req.query.to || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
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
