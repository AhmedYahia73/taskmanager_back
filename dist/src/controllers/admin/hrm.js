"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateHolidaysSystem = exports.getHolidaysSystem = exports.getAttendance = exports.updateOnlineRequestStatus = exports.getOnlineRequests = exports.updateHolidayRequestStatus = exports.getHolidayRequests = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const getHolidayRequests = async (req, res) => {
    try {
        const requests = await db_1.db
            .select({
            id: schema_1.holidayRequests.id,
            date: schema_1.holidayRequests.date,
            status: schema_1.holidayRequests.status,
            user: {
                id: schema_1.users.id,
                name: schema_1.users.name,
                phone: schema_1.users.phone,
                image: schema_1.users.image,
            }
        })
            .from(schema_1.holidayRequests)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.holidayRequests.userId, schema_1.users.id))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.holidayRequests.date));
        const pending = requests.filter(r => r.status === 'pending');
        const history = requests.filter(r => r.status !== 'pending');
        (0, response_1.SuccessResponse)(res, { pending, history }, 200);
    }
    catch (error) {
        console.error("Error fetching holiday requests:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getHolidayRequests = getHolidayRequests;
const updateHolidayRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['approve', 'reject', 'pending'].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }
        await db_1.db.update(schema_1.holidayRequests)
            .set({ status })
            .where((0, drizzle_orm_1.eq)(schema_1.holidayRequests.id, id));
        (0, response_1.SuccessResponse)(res, { message: "Status updated successfully" }, 200);
    }
    catch (error) {
        console.error("Error updating holiday request status:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.updateHolidayRequestStatus = updateHolidayRequestStatus;
const getOnlineRequests = async (req, res) => {
    try {
        const requests = await db_1.db
            .select({
            id: schema_1.onlineRequests.id,
            date: schema_1.onlineRequests.date,
            status: schema_1.onlineRequests.status,
            user: {
                id: schema_1.users.id,
                name: schema_1.users.name,
                phone: schema_1.users.phone,
                image: schema_1.users.image,
            }
        })
            .from(schema_1.onlineRequests)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.onlineRequests.userId, schema_1.users.id))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.onlineRequests.date));
        const pending = requests.filter(r => r.status === 'pending');
        const history = requests.filter(r => r.status !== 'pending');
        (0, response_1.SuccessResponse)(res, { pending, history }, 200);
    }
    catch (error) {
        console.error("Error fetching online requests:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getOnlineRequests = getOnlineRequests;
const updateOnlineRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['approve', 'reject', 'pending'].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }
        await db_1.db.update(schema_1.onlineRequests)
            .set({ status })
            .where((0, drizzle_orm_1.eq)(schema_1.onlineRequests.id, id));
        (0, response_1.SuccessResponse)(res, { message: "Status updated successfully" }, 200);
    }
    catch (error) {
        console.error("Error updating online request status:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.updateOnlineRequestStatus = updateOnlineRequestStatus;
const getAttendance = async (req, res) => {
    try {
        const records = await db_1.db
            .select({
            id: schema_1.attendance.id,
            from: schema_1.attendance.from,
            to: schema_1.attendance.to,
            onsite: schema_1.attendance.onsite,
            isRequestOnline: schema_1.attendance.isRequestOnline,
            hours: schema_1.attendance.hours,
            user: {
                id: schema_1.users.id,
                name: schema_1.users.name,
                phone: schema_1.users.phone,
                image: schema_1.users.image,
            }
        })
            .from(schema_1.attendance)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.attendance.userId, schema_1.users.id))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.attendance.from));
        (0, response_1.SuccessResponse)(res, { attendance: records }, 200);
    }
    catch (error) {
        console.error("Error fetching attendance records:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getAttendance = getAttendance;
const getHolidaysSystem = async (req, res) => {
    try {
        const result = await db_1.db.select().from(schema_1.holidays).limit(1);
        if (result.length === 0) {
            // Return defaults if none exist
            return (0, response_1.SuccessResponse)(res, {
                holidays: { type: 'fixed', days: [], workNum: 0, holidaysNum: 0 }
            }, 200);
        }
        (0, response_1.SuccessResponse)(res, { holidays: result[0] }, 200);
    }
    catch (error) {
        console.error("Error fetching holidays system:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getHolidaysSystem = getHolidaysSystem;
const updateHolidaysSystem = async (req, res) => {
    try {
        const { type, days, workNum, holidaysNum } = req.body;
        if (!['fixed', 'number'].includes(type)) {
            return res.status(400).json({ success: false, message: "Invalid type" });
        }
        const existing = await db_1.db.select().from(schema_1.holidays).limit(1);
        if (existing.length === 0) {
            await db_1.db.insert(schema_1.holidays).values({
                type,
                days: type === 'fixed' ? (days || []) : [],
                workNum: type === 'number' ? (workNum || 0) : 0,
                holidaysNum: type === 'number' ? (holidaysNum || 0) : 0,
            });
        }
        else {
            await db_1.db.update(schema_1.holidays)
                .set({
                type,
                days: type === 'fixed' ? (days || []) : [],
                workNum: type === 'number' ? (workNum || 0) : 0,
                holidaysNum: type === 'number' ? (holidaysNum || 0) : 0,
            })
                .where((0, drizzle_orm_1.eq)(schema_1.holidays.id, existing[0].id));
        }
        (0, response_1.SuccessResponse)(res, { message: "Holidays system updated successfully" }, 200);
    }
    catch (error) {
        console.error("Error updating holidays system:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.updateHolidaysSystem = updateHolidaysSystem;
