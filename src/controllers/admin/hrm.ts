import { Request, Response } from "express";
import { db } from "../../models/db";
import { holidayRequests, onlineRequests, attendance, users, holidays, permissions, settings, shifts, extraTimeRequests } from "../../models/schema"; 
import { eq, desc, ne, count, and, isNull, gte, lte } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";
import { notifyUser, notifyAdmins } from "../../services/notificationService";

export const getHolidayRequests = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const statusParam = (req.query.status as string) || 'pending';
        const offset = (page - 1) * limit;

        const role = (req as any).user?.role;
        const userId = (req as any).user?.id;

        let whereCondition = statusParam === 'pending' 
            ? eq(holidayRequests.status, 'pending') 
            : ne(holidayRequests.status, 'pending');

        if (role !== 'admin' && userId) {
            whereCondition = and(whereCondition, eq(holidayRequests.userId, userId)) as any;
        }

        const [records, [{ total }]] = await Promise.all([
            db.select({
                id: holidayRequests.id,
                date: holidayRequests.date,
                status: holidayRequests.status,
                user: {
                    id: users.id,
                    name: users.name,
                    phone: users.phone,
                    image: users.image,
                }
            })
            .from(holidayRequests)
            .innerJoin(users, eq(holidayRequests.userId, users.id))
            .where(whereCondition)
            .orderBy(desc(holidayRequests.date))
            .limit(limit)
            .offset(offset),
            db.select({ total: count() }).from(holidayRequests).where(whereCondition)
        ]);

        SuccessResponse(res, { 
            data: records,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }, 200);
    } catch (error) {
        console.error("Error fetching holiday requests:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updateHolidayRequestStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['approve', 'reject', 'pending'].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const [existing] = await db.select().from(holidayRequests).where(eq(holidayRequests.id, id)).limit(1);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        await db.update(holidayRequests)
            .set({ status })
            .where(eq(holidayRequests.id, id));

        // 👤 Notify the user whose request was approved / rejected
        if (status === 'approve' || status === 'reject') {
            const dateStr = existing.date instanceof Date ? existing.date.toISOString().split('T')[0] : String(existing.date);
            await notifyUser(existing.userId, {
                type: "holiday_request_status",
                description: `Your holiday request for ${dateStr} has been ${status === 'approve' ? 'approved' : 'rejected'}.`,
                link: "/attendance",
            });
        }

        SuccessResponse(res, { message: "Status updated successfully" }, 200);
    } catch (error) {
        console.error("Error updating holiday request status:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const addHolidayRequest = async (req: Request, res: Response) => {
    try {
        const userId = req.body.userId || (req as any).user?.id;
        const { date } = req.body;
        if (!userId) return res.status(401).json({ success: false, message: "User ID required" });
        await db.insert(holidayRequests).values({ userId, date: new Date(date) });
        SuccessResponse(res, { message: "Created successfully" }, 201);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updateHolidayRequest = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { date, status } = req.body;
        const updateData: any = {};
        if (date !== undefined) updateData.date = new Date(date);
        if (status !== undefined) updateData.status = status;
        
        await db.update(holidayRequests).set({ status }).where(eq(holidayRequests.id, id));
        SuccessResponse(res, { message: "Updated successfully" }, 200);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const deleteHolidayRequest = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await db.delete(holidayRequests).where(eq(holidayRequests.id, id));
        SuccessResponse(res, { message: "Deleted successfully" }, 200);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getOnlineRequests = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const statusParam = (req.query.status as string) || 'pending';
        const offset = (page - 1) * limit;

        const role = (req as any).user?.role;
        const userId = (req as any).user?.id;

        let whereCondition = statusParam === 'pending' 
            ? eq(onlineRequests.status, 'pending') 
            : ne(onlineRequests.status, 'pending');

        if (role !== 'admin' && userId) {
            whereCondition = and(whereCondition, eq(onlineRequests.userId, userId)) as any;
        }

        const [records, [{ total }]] = await Promise.all([
            db.select({
                id: onlineRequests.id,
                date: onlineRequests.date,
                status: onlineRequests.status,
                user: {
                    id: users.id,
                    name: users.name,
                    phone: users.phone,
                    image: users.image,
                }
            })
            .from(onlineRequests)
            .innerJoin(users, eq(onlineRequests.userId, users.id))
            .where(whereCondition)
            .orderBy(desc(onlineRequests.date))
            .limit(limit)
            .offset(offset),
            db.select({ total: count() }).from(onlineRequests).where(whereCondition)
        ]);

        SuccessResponse(res, { 
            data: records,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }, 200);
    } catch (error) {
        console.error("Error fetching online requests:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updateOnlineRequestStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['approve', 'reject', 'pending'].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const [existing] = await db.select().from(onlineRequests).where(eq(onlineRequests.id, id)).limit(1);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        await db.update(onlineRequests)
            .set({ status })
            .where(eq(onlineRequests.id, id));

        // 👤 Notify the user whose request was approved / rejected
        if (status === 'approve' || status === 'reject') {
            const dateStr = existing.date instanceof Date ? existing.date.toISOString().split('T')[0] : String(existing.date);
            await notifyUser(existing.userId, {
                type: "online_request_status",
                description: `Your online work request for ${dateStr} has been ${status === 'approve' ? 'approved' : 'rejected'}.`,
                link: "/attendance",
            });
        }

        SuccessResponse(res, { message: "Status updated successfully" }, 200);
    } catch (error) {
        console.error("Error updating online request status:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const addOnlineRequest = async (req: Request, res: Response) => {
    try {
        const userId = req.body.userId || (req as any).user?.id;
        const { date } = req.body;
        if (!userId) return res.status(401).json({ success: false, message: "User ID required" });
        await db.insert(onlineRequests).values({ userId, date: new Date(date) });
        SuccessResponse(res, { message: "Created successfully" }, 201);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updateOnlineRequest = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { date, status } = req.body;
        const updateData: any = {};
        if (date !== undefined) updateData.date = new Date(date);
        if (status !== undefined) updateData.status = status;
        
        await db.update(onlineRequests).set({ status }).where(eq(onlineRequests.id, id));
        SuccessResponse(res, { message: "Updated successfully" }, 200);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const deleteOnlineRequest = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await db.delete(onlineRequests).where(eq(onlineRequests.id, id));
        SuccessResponse(res, { message: "Deleted successfully" }, 200);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getAttendance = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const role = (req as any).user?.role;
        const userId = (req as any).user?.id;

        const whereCondition = (role !== 'admin' && userId) ? eq(attendance.userId, userId) : undefined;

        const [records, [{ total }]] = await Promise.all([
            db.select({
                id: attendance.id,
                from: attendance.from,
                to: attendance.to,
                onsite: attendance.onsite,
                isRequestOnline: attendance.isRequestOnline,
                hours: attendance.hours,
                delay: attendance.delay,
                user: {
                    id: users.id,
                    name: users.name,
                    phone: users.phone,
                    image: users.image,
                }
            })
            .from(attendance)
            .innerJoin(users, eq(attendance.userId, users.id))
            .where(whereCondition)
            .orderBy(desc(attendance.from))
            .limit(limit)
            .offset(offset),
            whereCondition ? db.select({ total: count() }).from(attendance).where(whereCondition) : db.select({ total: count() }).from(attendance)
        ]);

        SuccessResponse(res, { 
            data: records,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }, 200);
    } catch (error) {
        console.error("Error fetching attendance records:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const calculateHoursAndDelay = async (userId: string, fromDate: Date, toDate: Date | null) => {
    let hours = 0;
    let delay = 0;

    if (toDate) {
        const diffMs = toDate.getTime() - fromDate.getTime();
        hours = diffMs / (1000 * 60 * 60);
    }

    const sysSettings = await db.select().from(settings).limit(1);
    const delayPermissionMinutes = sysSettings[0]?.delay_premission_minutes || 0;

    const currentUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const shiftId = currentUser[0]?.shift_id;

    if (shiftId) {
        const userShift = await db.select().from(shifts).where(eq(shifts.id, shiftId)).limit(1);
        const shift = userShift[0];
        if (shift && shift.days) {
            let daysData: any = shift.days;
            if (typeof daysData === 'string') {
                try { daysData = JSON.parse(daysData); } catch (e) { daysData = {}; }
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

export const getUserAttendanceCurrentStatus = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        if (!userId) return res.status(400).json({ success: false, message: "User ID is required" });

        const openRecords = await db.select({
            id: attendance.id,
            from: attendance.from,
            to: attendance.to,
            onsite: attendance.onsite,
            isRequestOnline: attendance.isRequestOnline,
            delay: attendance.delay
        })
        .from(attendance)
        .where(and(
            eq(attendance.userId, userId),
            isNull(attendance.to)
        ))
        .orderBy(desc(attendance.from))
        .limit(1);

        if (openRecords.length > 0) {
            return SuccessResponse(res, {
                isCheckedIn: true,
                record: openRecords[0]
            }, 200);
        }

        return SuccessResponse(res, {
            isCheckedIn: false,
            record: null
        }, 200);
    } catch (error) {
        console.error("Error in getUserAttendanceCurrentStatus:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const addAttendance = async (req: Request, res: Response) => {
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
            const openRecords = await db.select().from(attendance)
                .where(and(
                    eq(attendance.userId, userId),
                    isNull(attendance.to)
                ))
                .orderBy(desc(attendance.from))
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

            await db.update(attendance).set({
                to: toDate,
                hours,
                delay,
                departureOnsite: onsite !== undefined ? !!onsite : existingRecord.departureOnsite
            }).where(eq(attendance.id, existingRecord.id));

            return SuccessResponse(res, { 
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

            const existingOpen = await db.select().from(attendance)
                .where(and(
                    eq(attendance.userId, userId),
                    gte(attendance.from, todayStart),
                    lte(attendance.from, todayEnd),
                    isNull(attendance.to)
                ))
                .orderBy(desc(attendance.from))
                .limit(1);

            const { delay } = await calculateHoursAndDelay(userId, fromDate, null);

            if (existingOpen.length > 0) {
                // تحديث وقت الحضور المفتوح اليوم
                await db.update(attendance).set({
                    from: fromDate,
                    onsite: !!onsite,
                    isRequestOnline: !!isRequestOnline,
                    delay
                }).where(eq(attendance.id, existingOpen[0].id));

                return SuccessResponse(res, { 
                    message: "تم تحديث وقت تسجيل الحضور بنجاح",
                    id: existingOpen[0].id
                }, 200);
            }

            // إنشاء سجل حضور جديد مفتوح (بدون checkout)
            const [insertResult] = await db.insert(attendance).values({
                userId,
                from: fromDate,
                to: null,
                onsite: !!onsite,
                isRequestOnline: !!isRequestOnline,
                hours: 0,
                delay
            });

            return SuccessResponse(res, { 
                message: "تم تسجيل الحضور بنجاح",
                id: (insertResult as any)?.insertId
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

        await db.insert(attendance).values({ 
            userId, 
            from: fromDate, 
            to: toDate,
            onsite: !!onsite,
            isRequestOnline: !!isRequestOnline,
            hours,
            delay
        });

        SuccessResponse(res, { message: "تم تسجيل الحضور والانصراف بنجاح" }, 201);
    } catch (error) {
        console.error("Error in addAttendance:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updateAttendance = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { from, to, onsite, isRequestOnline } = req.body;
        
        const existingRecord = await db.select().from(attendance).where(eq(attendance.id, id)).limit(1);
        if (existingRecord.length === 0) {
            return res.status(404).json({ success: false, message: "Record not found" });
        }

        const updateData: any = {};
        
        const fromDate = from !== undefined ? new Date(from) : existingRecord[0].from;
        const toDate = to !== undefined ? (to ? new Date(to) : null) : existingRecord[0].to;
        
        const { hours, delay } = await calculateHoursAndDelay(existingRecord[0].userId, fromDate, toDate);

        updateData.from = fromDate;
        updateData.to = toDate;
        updateData.hours = hours;
        updateData.delay = delay;
        
        if (onsite !== undefined) updateData.onsite = !!onsite;
        if (isRequestOnline !== undefined) updateData.isRequestOnline = !!isRequestOnline;
        
        await db.update(attendance).set(updateData).where(eq(attendance.id, id));
        SuccessResponse(res, { message: "Updated successfully" }, 200);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const deleteAttendance = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await db.delete(attendance).where(eq(attendance.id, id));
        SuccessResponse(res, { message: "Deleted successfully" }, 200);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getHolidaysSystem = async (req: Request, res: Response) => {
    try {
        const result = await db.select().from(holidays).limit(1);
        if (result.length === 0) {
            // Return defaults if none exist
            return SuccessResponse(res, { 
                holidays: { type: 'fixed', days: [], workNum: 0, holidaysNum: 0 } 
            }, 200);
        }
        SuccessResponse(res, { holidays: result[0] }, 200);
    } catch (error) {
        console.error("Error fetching holidays system:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updateHolidaysSystem = async (req: Request, res: Response) => {
    try {
        const { type, days, workNum, holidaysNum } = req.body;
        
        if (!['fixed', 'number'].includes(type)) {
            return res.status(400).json({ success: false, message: "Invalid type" });
        }

        const existing = await db.select().from(holidays).limit(1);

        if (existing.length === 0) {
            await db.insert(holidays).values({
                type,
                days: type === 'fixed' ? (days || []) : [],
                workNum: type === 'number' ? (workNum || 0) : 0,
                holidaysNum: type === 'number' ? (holidaysNum || 0) : 0,
            });
        } else {
            await db.update(holidays)
                .set({
                    type,
                    days: type === 'fixed' ? (days || []) : [],
                    workNum: type === 'number' ? (workNum || 0) : 0,
                    holidaysNum: type === 'number' ? (holidaysNum || 0) : 0,
                })
                .where(eq(holidays.id, existing[0].id));
        }

        SuccessResponse(res, { message: "Holidays system updated successfully" }, 200);
    } catch (error) {
        console.error("Error updating holidays system:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getPermissions = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const statusParam = (req.query.status as string) || 'pending';
        const offset = (page - 1) * limit;

        const role = (req as any).user?.role;
        const userId = (req as any).user?.id;

        let whereCondition = statusParam === 'pending' 
            ? eq(permissions.status, 'pending') 
            : ne(permissions.status, 'pending');

        if (role !== 'admin' && userId) {
            whereCondition = and(whereCondition, eq(permissions.userId, userId)) as any;
        }

        const [records, [{ total }]] = await Promise.all([
            db.select({
                id: permissions.id,
                date: permissions.date,
                hours: permissions.hours,
                reason: permissions.reason,
                status: permissions.status,
                user: {
                    id: users.id,
                    name: users.name,
                    phone: users.phone,
                    image: users.image,
                }
            })
            .from(permissions)
            .innerJoin(users, eq(permissions.userId, users.id))
            .where(whereCondition)
            .orderBy(desc(permissions.date))
            .limit(limit)
            .offset(offset),
            db.select({ total: count() }).from(permissions).where(whereCondition)
        ]);

        SuccessResponse(res, { 
            data: records,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }, 200);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updatePermissionStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['approve', 'reject', 'pending'].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const [existing] = await db.select().from(permissions).where(eq(permissions.id, id)).limit(1);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        await db.update(permissions).set({ status }).where(eq(permissions.id, id));

        // 👤 Notify the user whose request was approved / rejected
        if (status === 'approve' || status === 'reject') {
            const dateStr = existing.date instanceof Date ? existing.date.toISOString().split('T')[0] : String(existing.date);
            await notifyUser(existing.userId, {
                type: "permission_request_status",
                description: `Your permission request for ${existing.hours} hour(s) on ${dateStr} has been ${status === 'approve' ? 'approved' : 'rejected'}.`,
                link: "/attendance",
            });
        }

        SuccessResponse(res, { message: "Status updated" }, 200);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const addPermission = async (req: Request, res: Response) => {
    try {
        const userId = req.body.userId || (req as any).user?.id;
        const { date, hours, reason } = req.body;
        if (!userId) return res.status(401).json({ success: false, message: "User ID required" });
        await db.insert(permissions).values({ userId, date: new Date(date), hours, reason });
        SuccessResponse(res, { message: "Created successfully" }, 201);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updatePermission = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { date, hours, reason, status } = req.body;
        const updateData: any = {};
        if (date !== undefined) updateData.date = new Date(date);
        if (hours !== undefined) updateData.hours = hours;
        if (reason !== undefined) updateData.reason = reason;
        if (status !== undefined) updateData.status = status;
        
        await db.update(permissions).set(updateData).where(eq(permissions.id, id));
        SuccessResponse(res, { message: "Updated successfully" }, 200);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const deletePermission = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await db.delete(permissions).where(eq(permissions.id, id));
        SuccessResponse(res, { message: "Deleted successfully" }, 200);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// 📌 Get Extra Time Requests (for Admin HRM & Employee view)
export const getExtraTimeRequests = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const statusParam = (req.query.status as string) || 'pending';
        const offset = (page - 1) * limit;

        const role = (req as any).user?.role;
        const userId = (req as any).user?.id;

        let whereCondition = statusParam === 'pending'
            ? eq(extraTimeRequests.status, 'pending')
            : ne(extraTimeRequests.status, 'pending');

        if (role !== 'admin' && role !== 'super_admin' && userId) {
            whereCondition = and(whereCondition, eq(extraTimeRequests.userId, userId)) as any;
        }

        const [records, [{ total }]] = await Promise.all([
            db.select({
                id: extraTimeRequests.id,
                date: extraTimeRequests.date,
                early_attend: extraTimeRequests.early_attend,
                late_leave: extraTimeRequests.late_leave,
                status: extraTimeRequests.status,
                createdAt: extraTimeRequests.createdAt,
                user: {
                    id: users.id,
                    name: users.name,
                    phone: users.phone,
                    image: users.image,
                }
            })
            .from(extraTimeRequests)
            .innerJoin(users, eq(extraTimeRequests.userId, users.id))
            .where(whereCondition)
            .orderBy(desc(extraTimeRequests.date))
            .limit(limit)
            .offset(offset),
            db.select({ total: count() }).from(extraTimeRequests).where(whereCondition)
        ]);

        SuccessResponse(res, {
            data: records,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }, 200);
    } catch (error) {
        console.error("Error fetching extra time requests:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// 📌 Update Extra Time Request Status (Approve / Reject)
export const updateExtraTimeRequestStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['approve', 'reject', 'pending'].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status. Must be approve, reject, or pending" });
        }

        const [existing] = await db.select().from(extraTimeRequests).where(eq(extraTimeRequests.id, id)).limit(1);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        await db.update(extraTimeRequests)
            .set({ status })
            .where(eq(extraTimeRequests.id, id));

        // Real-time and persistent notification to the employee
        if (status === 'approve' || status === 'reject') {
            const types = [];
            if (existing.early_attend) types.push("Early Attend");
            if (existing.late_leave) types.push("Late Leave");
            const typeStr = types.join(" & ") || "Extra Time";
            const dateStr = existing.date instanceof Date ? existing.date.toISOString().split('T')[0] : String(existing.date);

            await notifyUser(existing.userId, {
                type: "extra_time_status",
                link: "/attendance",
                description: `Your ${typeStr} request for ${dateStr} has been ${status === 'approve' ? 'approved' : 'rejected'}.`,
            });
        }

        SuccessResponse(res, { message: `Request ${status}d successfully` }, 200);
    } catch (error) {
        console.error("Error updating extra time request status:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// 📌 Delete Extra Time Request
export const deleteExtraTimeRequest = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await db.delete(extraTimeRequests).where(eq(extraTimeRequests.id, id));
        SuccessResponse(res, { message: "Deleted successfully" }, 200);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// 📌 Add Extra Time Request (usable by engineer, leader, leader_sales, admin)
export const addExtraTimeRequest = async (req: Request, res: Response) => {
    try {
        const userId = req.body.userId || (req as any).user?.id;
        const { date, early_attend, late_leave } = req.body;
        if (!userId) return res.status(401).json({ success: false, message: "User ID required" });
        if (!date) return res.status(400).json({ success: false, message: "Date is required" });
        if (!early_attend && !late_leave) {
            return res.status(400).json({ success: false, message: "At least early_attend or late_leave must be true" });
        }

        await db.insert(extraTimeRequests).values({
            userId,
            date: new Date(date),
            early_attend: Boolean(early_attend),
            late_leave: Boolean(late_leave),
            status: "pending"
        });

        // Fetch user name for notification
        const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
        const userName = u?.name || "Employee";

        // 📢 Notify Admins
        await notifyAdmins({
            type: "extra_time_request",
            link: "/admin/extra-time-requests",
            description: `${userName} submitted an extra time request for ${date}`,
        });

        SuccessResponse(res, { message: "Extra time request created successfully" }, 201);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


