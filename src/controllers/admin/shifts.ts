import { Request, Response } from "express";
import { db } from "../../models/db";
import { shifts, zones } from "../../models/schema"; 
import { eq } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";

export const getAllShifts = async (req: Request, res: Response) => {
    try {
        const allShifts = await db.select({
            id: shifts.id,
            name: shifts.name,
            zone_id: shifts.zone_id,
            from: shifts.from,
            to: shifts.to,
            zone_name: zones.name
        })
        .from(shifts)
        .leftJoin(zones, eq(shifts.zone_id, zones.id));

        SuccessResponse(res, { Shifts: allShifts }, 200);
    } catch (error) {
        console.error("Error fetching shifts:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const createShift = async (req: Request, res: Response) => {
    try {
        const { name, zone_id, from, to } = req.body;
        
        if (!name || !zone_id || !from || !to) {
            return res.status(400).json({ success: false, message: "Name, zone_id, from, and to are required" });
        }

        // We assume from and to are provided as standard time strings like '09:00'
        // The DB expects a valid date/datetime string. We'll format it.
        const fromDate = new Date(`1970-01-01T${from}:00Z`);
        const toDate = new Date(`1970-01-01T${to}:00Z`);

        await db.insert(shifts).values({
            name,
            zone_id,
            from: fromDate,
            to: toDate,
        });

        SuccessResponse(res, { message: "Shift created successfully" }, 201);
    } catch (error) {
        console.error("Error creating shift:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updateShift = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, zone_id, from, to } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: "Shift ID is required" });
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (zone_id !== undefined) updateData.zone_id = zone_id;
        
        if (from !== undefined) {
            updateData.from = new Date(`1970-01-01T${from}:00Z`);
        }
        if (to !== undefined) {
            updateData.to = new Date(`1970-01-01T${to}:00Z`);
        }

        await db.update(shifts).set(updateData).where(eq(shifts.id, id));

        SuccessResponse(res, { message: "Shift updated successfully" }, 200);
    } catch (error) {
        console.error("Error updating shift:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const deleteShift = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: false, message: "Shift ID is required" });
        }

        await db.delete(shifts).where(eq(shifts.id, id));

        SuccessResponse(res, { message: "Shift deleted successfully" }, 200);
    } catch (error) {
        console.error("Error deleting shift:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
