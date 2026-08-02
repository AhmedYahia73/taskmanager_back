import { Request, Response } from "express";
import { db } from "../../models/db";
import { holidayRequests, onlineRequests, attendance, users, holidays, permissions, settings, shifts } from "../../models/schema"; 
import { eq, desc, ne, count, and } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";

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

        await db.update(holidayRequests)
            .set({ status })
            .where(eq(holidayRequests.id, id));

        SuccessResponse(res, { message: "Status updated successfully" }, 200);
    } catch (error) {
        console.error("Error updating holiday request status:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const addHolidayRequest = async (req: Request, res: Response) => {
    try {
        const { userId, date } = req.body;
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

        await db.update(onlineRequests)
            .set({ status })
            .where(eq(onlineRequests.id, id));

        SuccessResponse(res, { message: "Status updated successfully" }, 200);
    } catch (error) {
        console.error("Error updating online request status:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const addOnlineRequest = async (req: Request, res: Response) => {
    try {
        const { userId, date } = req.body;
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
        if (userShift[0] && userShift[0].from && userShift[0].to) {
            const shift = userShift[0];
            const fromStr = shift.from instanceof Date ? shift.from.toTimeString().split(' ')[0] : String(shift.from);
            const [shiftFromH, shiftFromM] = fromStr.split(':').map(Number);
            
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
    
    return { hours, delay };
};

export const addAttendance = async (req: Request, res: Response) => {
    try {
        const { userId, from, to, onsite, isRequestOnline } = req.body;
        
        const fromDate = new Date(from);
        const toDate = to ? new Date(to) : null;
        
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
        SuccessResponse(res, { message: "Created successfully" }, 201);
    } catch (error) {
        console.error(error);
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
        await db.update(permissions).set({ status }).where(eq(permissions.id, id));
        SuccessResponse(res, { message: "Status updated" }, 200);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const addPermission = async (req: Request, res: Response) => {
    try {
        const { userId, date, hours, reason } = req.body;
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

