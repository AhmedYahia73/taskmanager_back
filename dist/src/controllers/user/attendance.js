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
const getAttendanceStatus = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const openRecords = await db_1.db.select().from(schema_1.attendance)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendance.userId, userId), (0, drizzle_orm_1.isNull)(schema_1.attendance.to)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.attendance.from))
            .limit(1);
        if (openRecords.length > 0) {
            return (0, response_1.SuccessResponse)(res, { isCheckedIn: true, record: openRecords[0] }, 200);
        }
        return (0, response_1.SuccessResponse)(res, { isCheckedIn: false, record: null }, 200);
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
        const { lat, lng } = req.body;
        const sysSettings = await db_1.db.select().from(schema_1.settings).limit(1);
        const locations = sysSettings[0]?.locations || [];
        const onlineDays = sysSettings[0]?.online_days || [];
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDayName = daysOfWeek[new Date().getDay()];
        const isOnlineDay = onlineDays.includes(currentDayName);
        let onsite = false;
        if (lat !== undefined && lng !== undefined) {
            for (const poly of locations) {
                if (isPointInPolygon(lat, lng, poly)) {
                    onsite = true;
                    break;
                }
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
        const { lat, lng } = req.body;
        const openRecords = await db_1.db.select().from(schema_1.attendance)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendance.userId, userId), (0, drizzle_orm_1.isNull)(schema_1.attendance.to)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.attendance.from))
            .limit(1);
        if (openRecords.length === 0) {
            return res.status(400).json({ success: false, message: "No active check-in found." });
        }
        const record = openRecords[0];
        const toDate = new Date();
        const sysSettings = await db_1.db.select().from(schema_1.settings).limit(1);
        const locations = sysSettings[0]?.locations || [];
        let departureOnsite = false;
        if (lat !== undefined && lng !== undefined) {
            for (const poly of locations) {
                if (isPointInPolygon(lat, lng, poly)) {
                    departureOnsite = true;
                    break;
                }
            }
        }
        const diffMs = toDate.getTime() - record.from.getTime();
        let workedHours = diffMs / (1000 * 60 * 60);
        let delay = 0;
        let earlyLeave = 0;
        const shifts = sysSettings[0]?.shifts || [];
        const delayPermissionMinutes = sysSettings[0]?.delay_premission_minutes || 0;
        if (shifts.length > 0) {
            // Find closest shift logic (simplified to taking the first one for now)
            const shift = shifts[0];
            const [shiftFromH, shiftFromM] = shift.from.split(':').map(Number);
            const [shiftToH, shiftToM] = shift.to.split(':').map(Number);
            const expectedStart = new Date(record.from);
            expectedStart.setHours(shiftFromH, shiftFromM, 0, 0);
            let expectedEnd = new Date(record.from);
            expectedEnd.setHours(shiftToH, shiftToM, 0, 0);
            if (expectedEnd.getTime() < expectedStart.getTime()) {
                expectedEnd.setDate(expectedEnd.getDate() + 1);
            }
            const lateMs = record.from.getTime() - expectedStart.getTime();
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
        const todayStart = new Date(record.from);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(record.from);
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
