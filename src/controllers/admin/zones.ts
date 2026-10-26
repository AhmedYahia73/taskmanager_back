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
            const ipStatus = zone.router_ip_status ?? zone.router_mac_status ?? false;
            const ipVal = zone.router_ip || zone.router_mac || null;
            return {
                ...zone,
                router_ip_status: Boolean(ipStatus),
                router_ip: ipVal,
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
        const { 
            name, locations, status, 
            router_ip_status, router_ip, ip, ip_status,
            router_mac_status, router_mac, mac_status, mac_address 
        } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, message: "Zone name is required" });
        }

        const effectiveIpStatus = router_ip_status !== undefined 
            ? Boolean(router_ip_status) 
            : (ip_status !== undefined
                ? Boolean(ip_status)
                : (router_mac_status !== undefined 
                    ? Boolean(router_mac_status) 
                    : (mac_status !== undefined ? Boolean(mac_status) : false)));

        const effectiveIp = (router_ip || ip || router_mac || mac_address || "").trim() || null;

        await db.insert(zones).values({
            name,
            locations: locations || [],
            status: status !== undefined ? status : true,
            router_ip_status: effectiveIpStatus,
            router_ip: effectiveIp,
            router_mac_status: effectiveIpStatus,
            router_mac: effectiveIp
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
        const { 
            name, locations, status, 
            router_ip_status, router_ip, ip, ip_status,
            router_mac_status, router_mac, mac_status, mac_address 
        } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: "Zone ID is required" });
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (locations !== undefined) updateData.locations = locations;
        if (status !== undefined) updateData.status = status;

        let hasStatusUpdate = false;
        let effectiveStatus = false;
        if (router_ip_status !== undefined) {
            effectiveStatus = Boolean(router_ip_status);
            hasStatusUpdate = true;
        } else if (ip_status !== undefined) {
            effectiveStatus = Boolean(ip_status);
            hasStatusUpdate = true;
        } else if (router_mac_status !== undefined) {
            effectiveStatus = Boolean(router_mac_status);
            hasStatusUpdate = true;
        } else if (mac_status !== undefined) {
            effectiveStatus = Boolean(mac_status);
            hasStatusUpdate = true;
        }

        if (hasStatusUpdate) {
            updateData.router_ip_status = effectiveStatus;
            updateData.router_mac_status = effectiveStatus;
        }

        let hasIpUpdate = false;
        let effectiveIpVal: string | null = null;
        if (router_ip !== undefined) {
            effectiveIpVal = (router_ip || "").trim() || null;
            hasIpUpdate = true;
        } else if (ip !== undefined) {
            effectiveIpVal = (ip || "").trim() || null;
            hasIpUpdate = true;
        } else if (router_mac !== undefined) {
            effectiveIpVal = (router_mac || "").trim() || null;
            hasIpUpdate = true;
        } else if (mac_address !== undefined) {
            effectiveIpVal = (mac_address || "").trim() || null;
            hasIpUpdate = true;
        }

        if (hasIpUpdate) {
            updateData.router_ip = effectiveIpVal;
            updateData.router_mac = effectiveIpVal;
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
