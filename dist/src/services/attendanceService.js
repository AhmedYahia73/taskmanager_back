"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAttendanceReport = void 0;
const db_1 = require("../models/db");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const calculateAttendanceReport = async (userId, fromDateStr, toDateStr) => {
    const fromDate = new Date(fromDateStr);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(toDateStr);
    toDate.setHours(23, 59, 59, 999);
    // Fetch all related data in the date range
    const [attRecords, holReqs, onlReqs, permReqs, holSystem] = await Promise.all([
        db_1.db.select().from(schema_1.attendance)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendance.userId, userId), (0, drizzle_orm_1.gte)(schema_1.attendance.from, fromDate), (0, drizzle_orm_1.lte)(schema_1.attendance.from, toDate)))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.attendance.from)),
        db_1.db.select().from(schema_1.holidayRequests)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.holidayRequests.userId, userId), (0, drizzle_orm_1.gte)(schema_1.holidayRequests.date, fromDate), (0, drizzle_orm_1.lte)(schema_1.holidayRequests.date, toDate))),
        db_1.db.select().from(schema_1.onlineRequests)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.onlineRequests.userId, userId), (0, drizzle_orm_1.gte)(schema_1.onlineRequests.date, fromDate), (0, drizzle_orm_1.lte)(schema_1.onlineRequests.date, toDate))),
        db_1.db.select().from(schema_1.permissions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.permissions.userId, userId), (0, drizzle_orm_1.gte)(schema_1.permissions.date, fromDate), (0, drizzle_orm_1.lte)(schema_1.permissions.date, toDate), (0, drizzle_orm_1.eq)(schema_1.permissions.status, "approve"))),
        db_1.db.select().from(schema_1.holidays).limit(1)
    ]);
    const sysHolidays = holSystem[0] || { type: 'fixed', days: [], workNum: 0, holidaysNum: 0 };
    // Convert to dictionaries for O(1) lookup by YYYY-MM-DD
    const formatDate = (d) => d.toISOString().split('T')[0];
    const dict = {
        att: {},
        holReq: {},
        onlReq: {},
        permReq: {}
    };
    attRecords.forEach(r => dict.att[formatDate(new Date(r.from))] = r);
    holReqs.forEach(r => dict.holReq[formatDate(new Date(r.date))] = r);
    onlReqs.forEach(r => dict.onlReq[formatDate(new Date(r.date))] = r);
    permReqs.forEach(r => {
        const d = formatDate(new Date(r.date));
        dict.permReq[d] = (dict.permReq[d] || 0) + r.hours;
    });
    // Helper for continuous work logic for type='number'
    // This is a naive implementation that checks backward from DB
    let workStreak = 0;
    if (sysHolidays.type === 'number') {
        const allPastAtt = await db_1.db.select().from(schema_1.attendance)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendance.userId, userId), (0, drizzle_orm_1.lte)(schema_1.attendance.from, fromDate)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.attendance.from));
        // Calculate the streak before the 'from' date
        let currentDate = new Date(fromDate);
        currentDate.setDate(currentDate.getDate() - 1);
        for (const record of allPastAtt) {
            const dStr = formatDate(new Date(record.from));
            const cStr = formatDate(currentDate);
            if (dStr === cStr) {
                workStreak++;
                currentDate.setDate(currentDate.getDate() - 1);
            }
            else {
                break; // gap found
            }
        }
    }
    const report = [];
    const summary = {
        totalDelay: 0,
        totalPermissionHours: 0,
        onsiteDays: 0,
        onlineWithRequest: 0,
        onlineWithoutRequest: 0,
        holidayApproved: 0,
        holidayRejected: 0,
        holidayStandard: 0,
        unexcusedAbsence: 0
    };
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
        const dStr = formatDate(d);
        const dayName = daysOfWeek[d.getDay()];
        const att = dict.att[dStr];
        const hReq = dict.holReq[dStr];
        const oReq = dict.onlReq[dStr];
        const pHours = dict.permReq[dStr] || 0;
        let status = '';
        let color = ''; // green, red, gray, orange, or empty
        if (att) {
            // User attended
            status = 'Present';
            workStreak++;
            summary.totalDelay += att.delay || 0;
            summary.totalPermissionHours += pHours;
            if (att.onsite) {
                summary.onsiteDays++;
            }
            else if (att.isRequestOnline) {
                summary.onlineWithRequest++;
            }
            else {
                summary.onlineWithoutRequest++;
            }
        }
        else {
            // User absent
            if (hReq) {
                if (hReq.status === 'approve') {
                    status = 'Holiday (Approved)';
                    color = 'bg-green-100 border-green-300';
                    summary.holidayApproved++;
                }
                else if (hReq.status === 'reject') {
                    status = 'Absent (Holiday Rejected)';
                    color = 'bg-red-100 border-red-300';
                    summary.holidayRejected++;
                }
                else {
                    status = 'Absent (Holiday Pending)';
                    color = 'bg-orange-100 border-orange-300';
                    summary.unexcusedAbsence++;
                }
            }
            else {
                // Check if standard holiday
                let isStandardHoliday = false;
                if (sysHolidays.type === 'fixed') {
                    if (sysHolidays.days && Array.isArray(sysHolidays.days) && sysHolidays.days.includes(dayName)) {
                        isStandardHoliday = true;
                    }
                }
                else if (sysHolidays.type === 'number') {
                    if (workStreak >= (sysHolidays.workNum || 0)) {
                        isStandardHoliday = true;
                        workStreak = 0; // Reset streak after taking a holiday? Based on standard logic
                    }
                }
                if (isStandardHoliday) {
                    status = 'Holiday (Standard)';
                    color = 'bg-gray-100 border-gray-300';
                    summary.holidayStandard++;
                }
                else {
                    status = 'Unexcused Absence';
                    color = 'bg-orange-100 border-orange-300';
                    summary.unexcusedAbsence++;
                    workStreak = 0; // Gap found, reset streak
                }
            }
        }
        report.push({
            date: dStr,
            day: dayName,
            status,
            color,
            attendance: att ? {
                from: att.from,
                to: att.to,
                hours: att.hours,
                delay: att.delay,
                permissionHours: pHours
            } : null
        });
    }
    return { report, summary };
};
exports.calculateAttendanceReport = calculateAttendanceReport;
