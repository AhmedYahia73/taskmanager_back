import { Request, Response } from "express";
import { db } from "../../models/db";
import { holidayRequests, onlineRequests, attendance, users, holidays, permissions } from "../../models/schema"; 
import { eq, desc } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";

export const getHolidayRequests = async (req: Request, res: Response) => {
    try {
        const requests = await db
            .select({
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
            .orderBy(desc(holidayRequests.date));

        const pending = requests.filter(r => r.status === 'pending');
        const history = requests.filter(r => r.status !== 'pending');

        SuccessResponse(res, { pending, history }, 200);
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
        
        await db.update(holidayRequests).set(updateData).where(eq(holidayRequests.id, id));
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
        const requests = await db
            .select({
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
            .orderBy(desc(onlineRequests.date));

        const pending = requests.filter(r => r.status === 'pending');
        const history = requests.filter(r => r.status !== 'pending');

        SuccessResponse(res, { pending, history }, 200);
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
        
        await db.update(onlineRequests).set(updateData).where(eq(onlineRequests.id, id));
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
        const records = await db
            .select({
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
            .orderBy(desc(attendance.from));

        SuccessResponse(res, { attendance: records }, 200);
    } catch (error) {
        console.error("Error fetching attendance records:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const addAttendance = async (req: Request, res: Response) => {
    try {
        const { userId, from, to, onsite, isRequestOnline, hours, delay } = req.body;
        await db.insert(attendance).values({ 
            userId, 
            from: new Date(from), 
            to: to ? new Date(to) : null,
            onsite: !!onsite,
            isRequestOnline: !!isRequestOnline,
            hours: hours ? Number(hours) : 0,
            delay: delay ? Number(delay) : 0
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
        const { from, to, onsite, isRequestOnline, hours, delay } = req.body;
        
        const updateData: any = {};
        if (from !== undefined) updateData.from = new Date(from);
        if (to !== undefined) updateData.to = to ? new Date(to) : null;
        if (onsite !== undefined) updateData.onsite = !!onsite;
        if (isRequestOnline !== undefined) updateData.isRequestOnline = !!isRequestOnline;
        if (hours !== undefined) updateData.hours = Number(hours);
        if (delay !== undefined) updateData.delay = Number(delay);
        
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
        const requests = await db
            .select({
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
            .orderBy(desc(permissions.date));

        const pending = requests.filter(r => r.status === 'pending');
        const history = requests.filter(r => r.status !== 'pending');

        SuccessResponse(res, { pending, history }, 200);
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

