"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addExtraTimeRequest = exports.deleteExtraTimeRequest = exports.updateExtraTimeRequestStatus = exports.getExtraTimeRequests = exports.deletePermission = exports.updatePermission = exports.addPermission = exports.updatePermissionStatus = exports.getPermissions = exports.updateHolidaysSystem = exports.getHolidaysSystem = exports.deleteAttendance = exports.updateAttendance = exports.addAttendance = exports.getUserAttendanceCurrentStatus = exports.getAttendance = exports.deleteOnlineRequest = exports.updateOnlineRequest = exports.addOnlineRequest = exports.updateOnlineRequestStatus = exports.getOnlineRequests = exports.deleteHolidayRequest = exports.updateHolidayRequest = exports.addHolidayRequest = exports.updateHolidayRequestStatus = exports.getHolidayRequests = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const notificationService_1 = require("../../services/notificationService");
const getHolidayRequests = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const statusParam = req.query.status || 'pending';
        const offset = (page - 1) * limit;
        const role = req.user?.role;
        const userId = req.user?.id;
        let whereCondition = statusParam === 'pending'
            ? (0, drizzle_orm_1.eq)(schema_1.holidayRequests.status, 'pending')
            : (0, drizzle_orm_1.ne)(schema_1.holidayRequests.status, 'pending');
        if (role !== 'admin' && userId) {
            whereCondition = (0, drizzle_orm_1.and)(whereCondition, (0, drizzle_orm_1.eq)(schema_1.holidayRequests.userId, userId));
        }
        const [records, [{ total }]] = await Promise.all([
            db_1.db.select({
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
                .where(whereCondition)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.holidayRequests.date))
                .limit(limit)
                .offset(offset),
            db_1.db.select({ total: (0, drizzle_orm_1.count)() }).from(schema_1.holidayRequests).where(whereCondition)
        ]);
        (0, response_1.SuccessResponse)(res, {
            data: records,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }, 200);
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
        const [existing] = await db_1.db.select().from(schema_1.holidayRequests).where((0, drizzle_orm_1.eq)(schema_1.holidayRequests.id, id)).limit(1);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }
        await db_1.db.update(schema_1.holidayRequests)
            .set({ status })
            .where((0, drizzle_orm_1.eq)(schema_1.holidayRequests.id, id));
        // 👤 Notify the user whose request was approved / rejected
        if (status === 'approve' || status === 'reject') {
            const dateStr = existing.date instanceof Date ? existing.date.toISOString().split('T')[0] : String(existing.date);
            await (0, notificationService_1.notifyUser)(existing.userId, {
                type: "holiday_request_status",
                description: `Your holiday request for ${dateStr} has been ${status === 'approve' ? 'approved' : 'rejected'}.`,
                link: "/attendance",
            });
        }
        (0, response_1.SuccessResponse)(res, { message: "Status updated successfully" }, 200);
    }
    catch (error) {
        console.error("Error updating holiday request status:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.updateHolidayRequestStatus = updateHolidayRequestStatus;
const addHolidayRequest = async (req, res) => {
    try {
        const userId = req.body.userId || req.user?.id;
        const { date } = req.body;
        if (!userId)
            return res.status(401).json({ success: false, message: "User ID required" });
        await db_1.db.insert(schema_1.holidayRequests).values({ userId, date: new Date(date) });
        (0, response_1.SuccessResponse)(res, { message: "Created successfully" }, 201);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.addHolidayRequest = addHolidayRequest;
const updateHolidayRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, status } = req.body;
        const updateData = {};
        if (date !== undefined)
            updateData.date = new Date(date);
        if (status !== undefined)
            updateData.status = status;
        await db_1.db.update(schema_1.holidayRequests).set({ status }).where((0, drizzle_orm_1.eq)(schema_1.holidayRequests.id, id));
        (0, response_1.SuccessResponse)(res, { message: "Updated successfully" }, 200);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.updateHolidayRequest = updateHolidayRequest;
const deleteHolidayRequest = async (req, res) => {
    try {
        const { id } = req.params;
        await db_1.db.delete(schema_1.holidayRequests).where((0, drizzle_orm_1.eq)(schema_1.holidayRequests.id, id));
        (0, response_1.SuccessResponse)(res, { message: "Deleted successfully" }, 200);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.deleteHolidayRequest = deleteHolidayRequest;
const getOnlineRequests = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const statusParam = req.query.status || 'pending';
        const offset = (page - 1) * limit;
        const role = req.user?.role;
        const userId = req.user?.id;
        let whereCondition = statusParam === 'pending'
            ? (0, drizzle_orm_1.eq)(schema_1.onlineRequests.status, 'pending')
            : (0, drizzle_orm_1.ne)(schema_1.onlineRequests.status, 'pending');
        if (role !== 'admin' && userId) {
            whereCondition = (0, drizzle_orm_1.and)(whereCondition, (0, drizzle_orm_1.eq)(schema_1.onlineRequests.userId, userId));
        }
        const [records, [{ total }]] = await Promise.all([
            db_1.db.select({
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
                .where(whereCondition)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.onlineRequests.date))
                .limit(limit)
                .offset(offset),
            db_1.db.select({ total: (0, drizzle_orm_1.count)() }).from(schema_1.onlineRequests).where(whereCondition)
        ]);
        (0, response_1.SuccessResponse)(res, {
            data: records,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }, 200);
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
        const [existing] = await db_1.db.select().from(schema_1.onlineRequests).where((0, drizzle_orm_1.eq)(schema_1.onlineRequests.id, id)).limit(1);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }
        await db_1.db.update(schema_1.onlineRequests)
            .set({ status })
            .where((0, drizzle_orm_1.eq)(schema_1.onlineRequests.id, id));
        // 👤 Notify the user whose request was approved / rejected
        if (status === 'approve' || status === 'reject') {
            const dateStr = existing.date instanceof Date ? existing.date.toISOString().split('T')[0] : String(existing.date);
            await (0, notificationService_1.notifyUser)(existing.userId, {
                type: "online_request_status",
                description: `Your online work request for ${dateStr} has been ${status === 'approve' ? 'approved' : 'rejected'}.`,
                link: "/attendance",
            });
        }
        (0, response_1.SuccessResponse)(res, { message: "Status updated successfully" }, 200);
    }
    catch (error) {
        console.error("Error updating online request status:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.updateOnlineRequestStatus = updateOnlineRequestStatus;
const addOnlineRequest = async (req, res) => {
    try {
        const userId = req.body.userId || req.user?.id;
        const { date } = req.body;
        if (!userId)
            return res.status(401).json({ success: false, message: "User ID required" });
        await db_1.db.insert(schema_1.onlineRequests).values({ userId, date: new Date(date) });
        (0, response_1.SuccessResponse)(res, { message: "Created successfully" }, 201);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.addOnlineRequest = addOnlineRequest;
const updateOnlineRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, status } = req.body;
        const updateData = {};
        if (date !== undefined)
            updateData.date = new Date(date);
        if (status !== undefined)
            updateData.status = status;
        await db_1.db.update(schema_1.onlineRequests).set({ status }).where((0, drizzle_orm_1.eq)(schema_1.onlineRequests.id, id));
        (0, response_1.SuccessResponse)(res, { message: "Updated successfully" }, 200);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.updateOnlineRequest = updateOnlineRequest;
const deleteOnlineRequest = async (req, res) => {
    try {
        const { id } = req.params;
        await db_1.db.delete(schema_1.onlineRequests).where((0, drizzle_orm_1.eq)(schema_1.onlineRequests.id, id));
        (0, response_1.SuccessResponse)(res, { message: "Deleted successfully" }, 200);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.deleteOnlineRequest = deleteOnlineRequest;
const getAttendance = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const role = req.user?.role;
        const userId = req.user?.id;
        const whereCondition = (role !== 'admin' && userId) ? (0, drizzle_orm_1.eq)(schema_1.attendance.userId, userId) : undefined;
        const [records, [{ total }]] = await Promise.all([
            db_1.db.select({
                id: schema_1.attendance.id,
                from: schema_1.attendance.from,
                to: schema_1.attendance.to,
                onsite: schema_1.attendance.onsite,
                isRequestOnline: schema_1.attendance.isRequestOnline,
                hours: schema_1.attendance.hours,
                delay: schema_1.attendance.delay,
                user: {
                    id: schema_1.users.id,
                    name: schema_1.users.name,
                    phone: schema_1.users.phone,
                    image: schema_1.users.image,
                }
            })
                .from(schema_1.attendance)
                .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.attendance.userId, schema_1.users.id))
                .where(whereCondition)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.attendance.from))
                .limit(limit)
                .offset(offset),
            whereCondition ? db_1.db.select({ total: (0, drizzle_orm_1.count)() }).from(schema_1.attendance).where(whereCondition) : db_1.db.select({ total: (0, drizzle_orm_1.count)() }).from(schema_1.attendance)
        ]);
        (0, response_1.SuccessResponse)(res, {
            data: records,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }, 200);
    }
    catch (error) {
        console.error("Error fetching attendance records:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getAttendance = getAttendance;
const calculateHoursAndDelay = async (userId, fromDate, toDate) => {
    let hours = 0;
    let delay = 0;
    if (toDate) {
        const diffMs = toDate.getTime() - fromDate.getTime();
        hours = diffMs / (1000 * 60 * 60);
    }
    const sysSettings = await db_1.db.select().from(schema_1.settings).limit(1);
    const delayPermissionMinutes = sysSettings[0]?.delay_premission_minutes || 0;
    const currentUser = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
    const shiftId = currentUser[0]?.shift_id;
    if (shiftId) {
        const userShift = await db_1.db.select().from(schema_1.shifts).where((0, drizzle_orm_1.eq)(schema_1.shifts.id, shiftId)).limit(1);
        const shift = userShift[0];
        if (shift && shift.days) {
            let daysData = shift.days;
            if (typeof daysData === 'string') {
                try {
                    daysData = JSON.parse(daysData);
                }
                catch (e) {
                    daysData = {};
                }
            }
            const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const currentDayStr = daysOfWeek[fromDate.getDay()];
            const todayShift = daysData[currentDayStr];
            if (todayShift && todayShift.active && todayShift.from) {
                const [shiftFromH, shiftFromM] = todayShift.from.split(':').map(Number);
                const expectedStart = new Date(fromDate);
                expectedStart.setHours(shiftFromH, shiftFromM, 0, 0);
                const lateMs = fromDate.getTime() - expectedStart.getTime();
                if (lateMs > 0) {
                    const lateMinutes = lateMs / (1000 * 60);
                    if (lateMinutes > delayPermissionMinutes) {
                        delay += lateMs / (1000 * 60 * 60);
                    }
                }
            }
        }
    }
    return { hours, delay };
};
const getUserAttendanceCurrentStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId)
            return res.status(400).json({ success: false, message: "User ID is required" });
        const openRecords = await db_1.db.select({
            id: schema_1.attendance.id,
            from: schema_1.attendance.from,
            to: schema_1.attendance.to,
            onsite: schema_1.attendance.onsite,
            isRequestOnline: schema_1.attendance.isRequestOnline,
            delay: schema_1.attendance.delay
        })
            .from(schema_1.attendance)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendance.userId, userId), (0, drizzle_orm_1.isNull)(schema_1.attendance.to)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.attendance.from))
            .limit(1);
        if (openRecords.length > 0) {
            return (0, response_1.SuccessResponse)(res, {
                isCheckedIn: true,
                record: openRecords[0]
            }, 200);
        }
        return (0, response_1.SuccessResponse)(res, {
            isCheckedIn: false,
            record: null
        }, 200);
    }
    catch (error) {
        console.error("Error in getUserAttendanceCurrentStatus:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getUserAttendanceCurrentStatus = getUserAttendanceCurrentStatus;
const addAttendance = async (req, res) => {
    try {
        const { userId, from, to, onsite, isRequestOnline, action, mode } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required (يجب تحديد الموظف)" });
        }
        const isCheckOutOnly = action === 'checkout' || mode === 'checkout' || (!from && Boolean(to));
        const isCheckInOnly = action === 'checkin' || mode === 'checkin' || (Boolean(from) && !to);
        // ==============================================================
        // CASE 1: Check-Out Only (البحث عن تسجيل الحضور النشط وإغلاقه في نفس السجل)
        // ==============================================================
        if (isCheckOutOnly) {
            if (!to) {
                return res.status(400).json({
                    success: false,
                    message: "Check-out time is required (يجب تحديد وقت وتاريخ الانصراف)"
                });
            }
            const toDate = new Date(to);
            if (isNaN(toDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid check-out time (وقت الانصراف غير صالح)"
                });
            }
            // فحص هل الشخص قام بتسجيل حضور نشط مسبقاً (سجل مفتوح بدون checkout)
            const openRecords = await db_1.db.select().from(schema_1.attendance)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendance.userId, userId), (0, drizzle_orm_1.isNull)(schema_1.attendance.to)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.attendance.from))
                .limit(1);
            if (openRecords.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "لم يتم العثور على تسجيل حضور نشط لهذا الموظف لتسجيل الانصراف. يجب تسجيل الحضور أولاً."
                });
            }
            const existingRecord = openRecords[0];
            const fromDate = new Date(existingRecord.from);
            if (toDate.getTime() < fromDate.getTime()) {
                return res.status(400).json({
                    success: false,
                    message: "وقت الانصراف لا يمكن أن يكون قبل وقت الحضور المسجل."
                });
            }
            const { hours, delay } = await calculateHoursAndDelay(userId, fromDate, toDate);
            await db_1.db.update(schema_1.attendance).set({
                to: toDate,
                hours,
                delay,
                departureOnsite: onsite !== undefined ? !!onsite : existingRecord.departureOnsite
            }).where((0, drizzle_orm_1.eq)(schema_1.attendance.id, existingRecord.id));
            return (0, response_1.SuccessResponse)(res, {
                message: "تم تسجيل الانصراف بنجاح في نفس سجل الحضور",
                id: existingRecord.id,
                hours,
                delay
            }, 200);
        }
        // ==============================================================
        // CASE 2: Check-In Only (تسجيل حضور فقط بدون انصراف)
        // ==============================================================
        if (isCheckInOnly) {
            if (!from) {
                return res.status(400).json({
                    success: false,
                    message: "Check-in time is required (يجب تحديد وقت وتاريخ الحضور)"
                });
            }
            const fromDate = new Date(from);
            if (isNaN(fromDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid check-in time (وقت الحضور غير صالح)"
                });
            }
            // فحص هل يوجد حضور نشط لنفس الموظف اليوم
            const todayStart = new Date(fromDate);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(fromDate);
            todayEnd.setHours(23, 59, 59, 999);
            const existingOpen = await db_1.db.select().from(schema_1.attendance)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendance.userId, userId), (0, drizzle_orm_1.gte)(schema_1.attendance.from, todayStart), (0, drizzle_orm_1.lte)(schema_1.attendance.from, todayEnd), (0, drizzle_orm_1.isNull)(schema_1.attendance.to)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.attendance.from))
                .limit(1);
            const { delay } = await calculateHoursAndDelay(userId, fromDate, null);
            if (existingOpen.length > 0) {
                // تحديث وقت الحضور المفتوح اليوم
                await db_1.db.update(schema_1.attendance).set({
                    from: fromDate,
                    onsite: !!onsite,
                    isRequestOnline: !!isRequestOnline,
                    delay
                }).where((0, drizzle_orm_1.eq)(schema_1.attendance.id, existingOpen[0].id));
                return (0, response_1.SuccessResponse)(res, {
                    message: "تم تحديث وقت تسجيل الحضور بنجاح",
                    id: existingOpen[0].id
                }, 200);
            }
            // إنشاء سجل حضور جديد مفتوح (بدون checkout)
            const [insertResult] = await db_1.db.insert(schema_1.attendance).values({
                userId,
                from: fromDate,
                to: null,
                onsite: !!onsite,
                isRequestOnline: !!isRequestOnline,
                hours: 0,
                delay
            });
            return (0, response_1.SuccessResponse)(res, {
                message: "تم تسجيل الحضور بنجاح",
                id: insertResult?.insertId
            }, 201);
        }
        // ==============================================================
        // CASE 3: Full Record (حضور وانصراف معاً)
        // ==============================================================
        if (!from) {
            return res.status(400).json({ success: false, message: "Check-in time is required" });
        }
        const fromDate = new Date(from);
        const toDate = to ? new Date(to) : null;
        if (isNaN(fromDate.getTime())) {
            return res.status(400).json({ success: false, message: "Invalid check-in time" });
        }
        if (toDate && isNaN(toDate.getTime())) {
            return res.status(400).json({ success: false, message: "Invalid check-out time" });
        }
        if (toDate && toDate.getTime() < fromDate.getTime()) {
            return res.status(400).json({ success: false, message: "وقت الانصراف لا يمكن أن يكون قبل وقت الحضور." });
        }
        const { hours, delay } = await calculateHoursAndDelay(userId, fromDate, toDate);
        await db_1.db.insert(schema_1.attendance).values({
            userId,
            from: fromDate,
            to: toDate,
            onsite: !!onsite,
            isRequestOnline: !!isRequestOnline,
            hours,
            delay
        });
        (0, response_1.SuccessResponse)(res, { message: "تم تسجيل الحضور والانصراف بنجاح" }, 201);
    }
    catch (error) {
        console.error("Error in addAttendance:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.addAttendance = addAttendance;
const updateAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { from, to, onsite, isRequestOnline } = req.body;
        const existingRecord = await db_1.db.select().from(schema_1.attendance).where((0, drizzle_orm_1.eq)(schema_1.attendance.id, id)).limit(1);
        if (existingRecord.length === 0) {
            return res.status(404).json({ success: false, message: "Record not found" });
        }
        const updateData = {};
        const fromDate = from !== undefined ? new Date(from) : existingRecord[0].from;
        const toDate = to !== undefined ? (to ? new Date(to) : null) : existingRecord[0].to;
        const { hours, delay } = await calculateHoursAndDelay(existingRecord[0].userId, fromDate, toDate);
        updateData.from = fromDate;
        updateData.to = toDate;
        updateData.hours = hours;
        updateData.delay = delay;
        if (onsite !== undefined)
            updateData.onsite = !!onsite;
        if (isRequestOnline !== undefined)
            updateData.isRequestOnline = !!isRequestOnline;
        await db_1.db.update(schema_1.attendance).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.attendance.id, id));
        (0, response_1.SuccessResponse)(res, { message: "Updated successfully" }, 200);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.updateAttendance = updateAttendance;
const deleteAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        await db_1.db.delete(schema_1.attendance).where((0, drizzle_orm_1.eq)(schema_1.attendance.id, id));
        (0, response_1.SuccessResponse)(res, { message: "Deleted successfully" }, 200);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.deleteAttendance = deleteAttendance;
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
const getPermissions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const statusParam = req.query.status || 'pending';
        const offset = (page - 1) * limit;
        const role = req.user?.role;
        const userId = req.user?.id;
        let whereCondition = statusParam === 'pending'
            ? (0, drizzle_orm_1.eq)(schema_1.permissions.status, 'pending')
            : (0, drizzle_orm_1.ne)(schema_1.permissions.status, 'pending');
        if (role !== 'admin' && userId) {
            whereCondition = (0, drizzle_orm_1.and)(whereCondition, (0, drizzle_orm_1.eq)(schema_1.permissions.userId, userId));
        }
        const [records, [{ total }]] = await Promise.all([
            db_1.db.select({
                id: schema_1.permissions.id,
                date: schema_1.permissions.date,
                hours: schema_1.permissions.hours,
                reason: schema_1.permissions.reason,
                status: schema_1.permissions.status,
                user: {
                    id: schema_1.users.id,
                    name: schema_1.users.name,
                    phone: schema_1.users.phone,
                    image: schema_1.users.image,
                }
            })
                .from(schema_1.permissions)
                .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.permissions.userId, schema_1.users.id))
                .where(whereCondition)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.permissions.date))
                .limit(limit)
                .offset(offset),
            db_1.db.select({ total: (0, drizzle_orm_1.count)() }).from(schema_1.permissions).where(whereCondition)
        ]);
        (0, response_1.SuccessResponse)(res, {
            data: records,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }, 200);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getPermissions = getPermissions;
const updatePermissionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['approve', 'reject', 'pending'].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }
        const [existing] = await db_1.db.select().from(schema_1.permissions).where((0, drizzle_orm_1.eq)(schema_1.permissions.id, id)).limit(1);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }
        await db_1.db.update(schema_1.permissions).set({ status }).where((0, drizzle_orm_1.eq)(schema_1.permissions.id, id));
        // 👤 Notify the user whose request was approved / rejected
        if (status === 'approve' || status === 'reject') {
            const dateStr = existing.date instanceof Date ? existing.date.toISOString().split('T')[0] : String(existing.date);
            await (0, notificationService_1.notifyUser)(existing.userId, {
                type: "permission_request_status",
                description: `Your permission request for ${existing.hours} hour(s) on ${dateStr} has been ${status === 'approve' ? 'approved' : 'rejected'}.`,
                link: "/attendance",
            });
        }
        (0, response_1.SuccessResponse)(res, { message: "Status updated" }, 200);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.updatePermissionStatus = updatePermissionStatus;
const addPermission = async (req, res) => {
    try {
        const userId = req.body.userId || req.user?.id;
        const { date, hours, reason } = req.body;
        if (!userId)
            return res.status(401).json({ success: false, message: "User ID required" });
        await db_1.db.insert(schema_1.permissions).values({ userId, date: new Date(date), hours, reason });
        (0, response_1.SuccessResponse)(res, { message: "Created successfully" }, 201);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.addPermission = addPermission;
const updatePermission = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, hours, reason, status } = req.body;
        const updateData = {};
        if (date !== undefined)
            updateData.date = new Date(date);
        if (hours !== undefined)
            updateData.hours = hours;
        if (reason !== undefined)
            updateData.reason = reason;
        if (status !== undefined)
            updateData.status = status;
        await db_1.db.update(schema_1.permissions).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.permissions.id, id));
        (0, response_1.SuccessResponse)(res, { message: "Updated successfully" }, 200);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.updatePermission = updatePermission;
const deletePermission = async (req, res) => {
    try {
        const { id } = req.params;
        await db_1.db.delete(schema_1.permissions).where((0, drizzle_orm_1.eq)(schema_1.permissions.id, id));
        (0, response_1.SuccessResponse)(res, { message: "Deleted successfully" }, 200);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.deletePermission = deletePermission;
// 📌 Get Extra Time Requests (for Admin HRM & Employee view)
const getExtraTimeRequests = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const statusParam = req.query.status || 'pending';
        const offset = (page - 1) * limit;
        const role = req.user?.role;
        const userId = req.user?.id;
        let whereCondition = statusParam === 'pending'
            ? (0, drizzle_orm_1.eq)(schema_1.extraTimeRequests.status, 'pending')
            : (0, drizzle_orm_1.ne)(schema_1.extraTimeRequests.status, 'pending');
        if (role !== 'admin' && role !== 'super_admin' && userId) {
            whereCondition = (0, drizzle_orm_1.and)(whereCondition, (0, drizzle_orm_1.eq)(schema_1.extraTimeRequests.userId, userId));
        }
        const [records, [{ total }]] = await Promise.all([
            db_1.db.select({
                id: schema_1.extraTimeRequests.id,
                date: schema_1.extraTimeRequests.date,
                early_attend: schema_1.extraTimeRequests.early_attend,
                late_leave: schema_1.extraTimeRequests.late_leave,
                status: schema_1.extraTimeRequests.status,
                createdAt: schema_1.extraTimeRequests.createdAt,
                user: {
                    id: schema_1.users.id,
                    name: schema_1.users.name,
                    phone: schema_1.users.phone,
                    image: schema_1.users.image,
                }
            })
                .from(schema_1.extraTimeRequests)
                .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.extraTimeRequests.userId, schema_1.users.id))
                .where(whereCondition)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.extraTimeRequests.date))
                .limit(limit)
                .offset(offset),
            db_1.db.select({ total: (0, drizzle_orm_1.count)() }).from(schema_1.extraTimeRequests).where(whereCondition)
        ]);
        (0, response_1.SuccessResponse)(res, {
            data: records,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }, 200);
    }
    catch (error) {
        console.error("Error fetching extra time requests:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getExtraTimeRequests = getExtraTimeRequests;
// 📌 Update Extra Time Request Status (Approve / Reject)
const updateExtraTimeRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['approve', 'reject', 'pending'].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status. Must be approve, reject, or pending" });
        }
        const [existing] = await db_1.db.select().from(schema_1.extraTimeRequests).where((0, drizzle_orm_1.eq)(schema_1.extraTimeRequests.id, id)).limit(1);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }
        await db_1.db.update(schema_1.extraTimeRequests)
            .set({ status })
            .where((0, drizzle_orm_1.eq)(schema_1.extraTimeRequests.id, id));
        // Real-time and persistent notification to the employee
        if (status === 'approve' || status === 'reject') {
            const types = [];
            if (existing.early_attend)
                types.push("Early Attend");
            if (existing.late_leave)
                types.push("Late Leave");
            const typeStr = types.join(" & ") || "Extra Time";
            const dateStr = existing.date instanceof Date ? existing.date.toISOString().split('T')[0] : String(existing.date);
            await (0, notificationService_1.notifyUser)(existing.userId, {
                type: "extra_time_status",
                link: "/attendance",
                description: `Your ${typeStr} request for ${dateStr} has been ${status === 'approve' ? 'approved' : 'rejected'}.`,
            });
        }
        (0, response_1.SuccessResponse)(res, { message: `Request ${status}d successfully` }, 200);
    }
    catch (error) {
        console.error("Error updating extra time request status:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.updateExtraTimeRequestStatus = updateExtraTimeRequestStatus;
// 📌 Delete Extra Time Request
const deleteExtraTimeRequest = async (req, res) => {
    try {
        const { id } = req.params;
        await db_1.db.delete(schema_1.extraTimeRequests).where((0, drizzle_orm_1.eq)(schema_1.extraTimeRequests.id, id));
        (0, response_1.SuccessResponse)(res, { message: "Deleted successfully" }, 200);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.deleteExtraTimeRequest = deleteExtraTimeRequest;
// 📌 Add Extra Time Request (usable by engineer, leader, leader_sales, admin)
const addExtraTimeRequest = async (req, res) => {
    try {
        const userId = req.body.userId || req.user?.id;
        const { date, early_attend, late_leave } = req.body;
        if (!userId)
            return res.status(401).json({ success: false, message: "User ID required" });
        if (!date)
            return res.status(400).json({ success: false, message: "Date is required" });
        if (!early_attend && !late_leave) {
            return res.status(400).json({ success: false, message: "At least early_attend or late_leave must be true" });
        }
        await db_1.db.insert(schema_1.extraTimeRequests).values({
            userId,
            date: new Date(date),
            early_attend: Boolean(early_attend),
            late_leave: Boolean(late_leave),
            status: "pending"
        });
        // Fetch user name for notification
        const [u] = await db_1.db.select({ name: schema_1.users.name }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
        const userName = u?.name || "Employee";
        // 📢 Notify Admins
        await (0, notificationService_1.notifyAdmins)({
            type: "extra_time_request",
            link: "/admin/extra-time-requests",
            description: `${userName} submitted an extra time request for ${date}`,
        });
        (0, response_1.SuccessResponse)(res, { message: "Extra time request created successfully" }, 201);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.addExtraTimeRequest = addExtraTimeRequest;
