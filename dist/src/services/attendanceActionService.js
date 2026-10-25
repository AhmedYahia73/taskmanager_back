"use strict";
// src/services/attendanceActionService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCheckOutLogic = exports.executeCheckInLogic = exports.getOpenAttendanceRecord = void 0;
exports.isPointInPolygon = isPointInPolygon;
exports.parseTimeToSeconds = parseTimeToSeconds;
const db_1 = require("../models/db");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
function isPointInPolygon(lat, lng, polygon) {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const x_i = polygon[i][0], y_i = polygon[i][1];
        const x_j = polygon[j][0], y_j = polygon[j][1];
        const intersect = y_i > lng !== y_j > lng &&
            lat < ((x_j - x_i) * (lng - y_i)) / (y_j - y_i) + x_i;
        if (intersect)
            isInside = !isInside;
    }
    return isInside;
}
function parseTimeToSeconds(timeVal) {
    if (!timeVal || typeof timeVal !== "string")
        return null;
    const parts = timeVal.trim().split(":").map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1]))
        return null;
    const hours = parts[0];
    const minutes = parts[1];
    const seconds = parts.length > 2 && !isNaN(parts[2]) ? parts[2] : 0;
    return hours * 3600 + minutes * 60 + seconds;
}
const getOpenAttendanceRecord = async (userId) => {
    const openRecords = await db_1.db
        .select()
        .from(schema_1.attendance)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendance.userId, userId), (0, drizzle_orm_1.isNull)(schema_1.attendance.to)))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.attendance.from))
        .limit(1);
    return openRecords[0] || null;
};
exports.getOpenAttendanceRecord = getOpenAttendanceRecord;
// 📌 Core Check-In Logic
const executeCheckInLogic = async (params) => {
    const { userId, lat, lng, clientIp } = params;
    const currentUser = await db_1.db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
        .limit(1);
    if (currentUser.length === 0) {
        return {
            success: false,
            statusCode: 404,
            message: "User not found",
            action: "checkin",
        };
    }
    const sysSettings = await db_1.db.select().from(schema_1.settings).limit(1);
    const systemSettings = sysSettings[0] || {};
    // 🔒 Router IP validation if enabled
    if (systemSettings?.router_ip_status) {
        let userIp = clientIp || "";
        if (userIp === "::1" || userIp === "::ffff:127.0.0.1")
            userIp = "127.0.0.1";
        if (userIp.startsWith("::ffff:"))
            userIp = userIp.replace("::ffff:", "");
        if (userIp !== systemSettings.router_ip) {
            return {
                success: false,
                statusCode: 403,
                message: "Invalid Router IP. Please connect to the correct network.",
                action: "checkin",
            };
        }
    }
    // 🔒 Early Check-In restriction: settings.early_max
    const earlyMaxSeconds = parseTimeToSeconds(systemSettings?.early_max);
    if (earlyMaxSeconds !== null) {
        const now = new Date();
        const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        if (currentSeconds < earlyMaxSeconds) {
            // Must have an approved extraTimeRequest for today with early_attend = true
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(now);
            todayEnd.setHours(23, 59, 59, 999);
            const approvedEarly = await db_1.db
                .select()
                .from(schema_1.extraTimeRequests)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.extraTimeRequests.userId, userId), (0, drizzle_orm_1.eq)(schema_1.extraTimeRequests.status, "approve"), (0, drizzle_orm_1.eq)(schema_1.extraTimeRequests.early_attend, true), (0, drizzle_orm_1.gte)(schema_1.extraTimeRequests.date, todayStart), (0, drizzle_orm_1.lte)(schema_1.extraTimeRequests.date, todayEnd)))
                .limit(1);
            if (approvedEarly.length === 0) {
                return {
                    success: false,
                    statusCode: 403,
                    message: `Cannot check in before ${systemSettings.early_max} without an approved early attendance request.`,
                    action: "checkin",
                };
            }
        }
    }
    // Zone Polygon check
    const zoneId = currentUser[0]?.zone_id;
    let locations = [];
    if (zoneId) {
        const userZone = await db_1.db
            .select()
            .from(schema_1.zones)
            .where((0, drizzle_orm_1.eq)(schema_1.zones.id, zoneId))
            .limit(1);
        locations = userZone[0]?.locations || [];
        if (typeof locations === "string") {
            try {
                locations = JSON.parse(locations);
            }
            catch (e) {
                locations = [];
            }
        }
    }
    let onsite = false;
    if (lat !== undefined &&
        lng !== undefined &&
        Array.isArray(locations) &&
        locations.length >= 3) {
        if (isPointInPolygon(lat, lng, locations)) {
            onsite = true;
        }
    }
    // Online Days calculation
    let userOnlineDays = currentUser[0]?.online_days || [];
    if (typeof userOnlineDays === "string") {
        try {
            userOnlineDays = JSON.parse(userOnlineDays);
        }
        catch (e) {
            userOnlineDays = [];
        }
    }
    let onlineDays = Array.isArray(userOnlineDays) && userOnlineDays.length > 0
        ? userOnlineDays
        : systemSettings?.online_days || [];
    if (typeof onlineDays === "string") {
        try {
            onlineDays = JSON.parse(onlineDays);
        }
        catch (e) {
            onlineDays = [];
        }
    }
    const daysOfWeek = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ];
    const currentDayName = daysOfWeek[new Date().getDay()];
    const isOnlineDay = Array.isArray(onlineDays) &&
        onlineDays
            .map((d) => String(d).toLowerCase())
            .includes(currentDayName.toLowerCase());
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
        const requests = await db_1.db
            .select()
            .from(schema_1.onlineRequests)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.onlineRequests.userId, userId), (0, drizzle_orm_1.eq)(schema_1.onlineRequests.status, "approve"), (0, drizzle_orm_1.gte)(schema_1.onlineRequests.date, todayStart), (0, drizzle_orm_1.lte)(schema_1.onlineRequests.date, todayEnd)));
        if (requests.length > 0) {
            isRequestOnline = true;
        }
    }
    await db_1.db.insert(schema_1.attendance).values({
        userId,
        from: new Date(),
        onsite,
        isRequestOnline,
    });
    return {
        success: true,
        statusCode: 201,
        message: "Checked in successfully",
        action: "checkin",
        onsite,
        isRequestOnline,
    };
};
exports.executeCheckInLogic = executeCheckInLogic;
// 📌 Core Check-Out Logic
const executeCheckOutLogic = async (params) => {
    const { userId, lat, lng, clientIp } = params;
    const openRecords = await db_1.db
        .select()
        .from(schema_1.attendance)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendance.userId, userId), (0, drizzle_orm_1.isNull)(schema_1.attendance.to)))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.attendance.from))
        .limit(1);
    if (openRecords.length === 0) {
        return {
            success: false,
            statusCode: 400,
            message: "No active check-in found.",
            action: "checkout",
        };
    }
    const record = openRecords[0];
    const toDate = new Date();
    const currentUser = await db_1.db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
        .limit(1);
    if (currentUser.length === 0) {
        return {
            success: false,
            statusCode: 404,
            message: "User not found",
            action: "checkout",
        };
    }
    const sysSettings = await db_1.db.select().from(schema_1.settings).limit(1);
    const systemSettings = sysSettings[0] || {};
    // 🔒 Router IP validation if enabled
    if (systemSettings?.router_ip_status) {
        let userIp = clientIp || "";
        if (userIp === "::1" || userIp === "::ffff:127.0.0.1")
            userIp = "127.0.0.1";
        if (userIp.startsWith("::ffff:"))
            userIp = userIp.replace("::ffff:", "");
        if (userIp !== systemSettings.router_ip) {
            return {
                success: false,
                statusCode: 403,
                message: "Invalid Router IP. Please connect to the correct network.",
                action: "checkout",
            };
        }
    }
    // 🔒 Late Check-Out restriction: settings.late_max
    const lateMaxSeconds = parseTimeToSeconds(systemSettings?.late_max);
    if (lateMaxSeconds !== null) {
        const currentSeconds = toDate.getHours() * 3600 + toDate.getMinutes() * 60 + toDate.getSeconds();
        if (currentSeconds > lateMaxSeconds) {
            // Must have an approved extraTimeRequest for today with late_leave = true
            const todayStart = new Date(toDate);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(toDate);
            todayEnd.setHours(23, 59, 59, 999);
            const approvedLate = await db_1.db
                .select()
                .from(schema_1.extraTimeRequests)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.extraTimeRequests.userId, userId), (0, drizzle_orm_1.eq)(schema_1.extraTimeRequests.status, "approve"), (0, drizzle_orm_1.eq)(schema_1.extraTimeRequests.late_leave, true), (0, drizzle_orm_1.gte)(schema_1.extraTimeRequests.date, todayStart), (0, drizzle_orm_1.lte)(schema_1.extraTimeRequests.date, todayEnd)))
                .limit(1);
            if (approvedLate.length === 0) {
                return {
                    success: false,
                    statusCode: 403,
                    message: `Cannot check out after ${systemSettings.late_max} without an approved late leave request.`,
                    action: "checkout",
                };
            }
        }
    }
    const zoneId = currentUser[0]?.zone_id;
    const shiftId = currentUser[0]?.shift_id;
    let locations = [];
    if (zoneId) {
        const userZone = await db_1.db
            .select()
            .from(schema_1.zones)
            .where((0, drizzle_orm_1.eq)(schema_1.zones.id, zoneId))
            .limit(1);
        locations = userZone[0]?.locations || [];
        if (typeof locations === "string") {
            try {
                locations = JSON.parse(locations);
            }
            catch (e) {
                locations = [];
            }
        }
    }
    let departureOnsite = false;
    if (lat !== undefined &&
        lng !== undefined &&
        Array.isArray(locations) &&
        locations.length >= 3) {
        if (isPointInPolygon(lat, lng, locations)) {
            departureOnsite = true;
        }
    }
    const recordFromDate = new Date(record.from);
    const diffMs = toDate.getTime() - recordFromDate.getTime();
    const workedHours = diffMs / (1000 * 60 * 60);
    let delay = 0;
    let earlyLeave = 0;
    const delayPermissionMinutes = systemSettings?.delay_premission_minutes || 0;
    let userShift = null;
    if (shiftId) {
        const fetchedShift = await db_1.db
            .select()
            .from(schema_1.shifts)
            .where((0, drizzle_orm_1.eq)(schema_1.shifts.id, shiftId))
            .limit(1);
        userShift = fetchedShift[0];
    }
    if (userShift && userShift.days) {
        let daysData = userShift.days;
        if (typeof daysData === "string") {
            try {
                daysData = JSON.parse(daysData);
            }
            catch (e) {
                daysData = {};
            }
        }
        const daysOfWeek = [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
        ];
        const currentDayStr = daysOfWeek[recordFromDate.getDay()];
        const todayShift = daysData[currentDayStr];
        if (todayShift && todayShift.active && todayShift.from && todayShift.to) {
            const [shiftFromH, shiftFromM] = todayShift.from.split(":").map(Number);
            const [shiftToH, shiftToM] = todayShift.to.split(":").map(Number);
            const expectedStart = new Date(recordFromDate);
            expectedStart.setHours(shiftFromH, shiftFromM, 0, 0);
            let expectedEnd = new Date(recordFromDate);
            expectedEnd.setHours(shiftToH, shiftToM, 0, 0);
            if (expectedEnd.getTime() < expectedStart.getTime()) {
                expectedEnd.setDate(expectedEnd.getDate() + 1);
            }
            const requiredHours = (expectedEnd.getTime() - expectedStart.getTime()) / (1000 * 60 * 60);
            if (record.isRequestOnline || !record.onsite) {
                // Online mode: flexible hours, delay is shortage of total hours
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
    const permRecords = await db_1.db
        .select()
        .from(schema_1.permissions)
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
    await db_1.db
        .update(schema_1.attendance)
        .set({
        to: toDate,
        departureOnsite,
        hours: workedHours,
        delay: totalPenalty,
    })
        .where((0, drizzle_orm_1.eq)(schema_1.attendance.id, record.id));
    return {
        success: true,
        statusCode: 200,
        message: "Checked out successfully",
        action: "checkout",
        hours: workedHours,
        delay: totalPenalty,
        departureOnsite,
    };
};
exports.executeCheckOutLogic = executeCheckOutLogic;
