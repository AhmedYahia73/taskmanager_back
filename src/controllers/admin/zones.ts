import { Request, Response } from "express";
import { db } from "../../models/db";
import { zones, shifts } from "../../models/schema"; 
import { eq } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";

export const getZonesList = async (req: Request, res: Response) => {
    try {
        const zonesList = await db.select({ id: zones.id, name: zones.name }).from(zones);
        SuccessResponse(res, { Zones: zonesList }, 200);
    } catch (error) {
        console.error("Error fetching zones list:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getAllZones = async (req: Request, res: Response) => {
    try {
        const allZones = await db.select().from(zones);
        const allShifts = await db.select().from(shifts);

        const zonesWithShifts = allZones.map(zone => {
            return {
                ...zone,
                shifts: allShifts.filter(shift => shift.zone_id === zone.id)
            };
        });

        SuccessResponse(res, { Zones: zonesWithShifts }, 200);
    } catch (error) {
        console.error("Error fetching zones:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const createZone = async (req: Request, res: Response) => {
    try {
        const { name, locations, status } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, message: "Zone name is required" });
        }

        await db.insert(zones).values({
            name,
            locations: locations ? JSON.stringify(locations) : "[]",
            status: status !== undefined ? status : true
        });

        SuccessResponse(res, { message: "Zone created successfully" }, 201);
    } catch (error) {
        console.error("Error creating zone:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updateZone = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, locations, status } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: "Zone ID is required" });
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (locations !== undefined) updateData.locations = typeof locations === 'string' ? locations : JSON.stringify(locations);
        if (status !== undefined) updateData.status = status;

        await db.update(zones).set(updateData).where(eq(zones.id, id));

        SuccessResponse(res, { message: "Zone updated successfully" }, 200);
    } catch (error) {
        console.error("Error updating zone:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const deleteZone = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: false, message: "Zone ID is required" });
        }

        await db.delete(zones).where(eq(zones.id, id));

        SuccessResponse(res, { message: "Zone deleted successfully" }, 200);
    } catch (error) {
        console.error("Error deleting zone:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
