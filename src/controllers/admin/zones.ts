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
        console.log("createZone received body:", req.body);
        const { name, locations, status, router_mac_status, router_mac, mac_status, mac_address } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, message: "Zone name is required" });
        }

        const effectiveMacStatus = router_mac_status !== undefined 
            ? Boolean(router_mac_status) 
            : (mac_status !== undefined ? Boolean(mac_status) : false);
        const effectiveMac = (router_mac || mac_address || "").trim() || null;

        await db.insert(zones).values({
            name,
            locations: locations || [],
            status: status !== undefined ? status : true,
            router_mac_status: effectiveMacStatus,
            router_mac: effectiveMac
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
        const { name, locations, status, router_mac_status, router_mac, mac_status, mac_address } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: "Zone ID is required" });
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (locations !== undefined) updateData.locations = locations;
        if (status !== undefined) updateData.status = status;

        if (router_mac_status !== undefined) {
            updateData.router_mac_status = Boolean(router_mac_status);
        } else if (mac_status !== undefined) {
            updateData.router_mac_status = Boolean(mac_status);
        }

        if (router_mac !== undefined) {
            updateData.router_mac = (router_mac || "").trim() || null;
        } else if (mac_address !== undefined) {
            updateData.router_mac = (mac_address || "").trim() || null;
        }

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
