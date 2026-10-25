"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteZone = exports.updateZone = exports.createZone = exports.getAllZones = exports.getZonesList = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const getZonesList = async (req, res) => {
    try {
        const zonesList = await db_1.db.select({ id: schema_1.zones.id, name: schema_1.zones.name }).from(schema_1.zones);
        (0, response_1.SuccessResponse)(res, { Zones: zonesList }, 200);
    }
    catch (error) {
        console.error("Error fetching zones list:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getZonesList = getZonesList;
const getAllZones = async (req, res) => {
    try {
        const allZones = await db_1.db.select().from(schema_1.zones);
        const allShifts = await db_1.db.select().from(schema_1.shifts);
        const zonesWithShifts = allZones.map(zone => {
            return {
                ...zone,
                shifts: allShifts.filter(shift => shift.zone_id === zone.id)
            };
        });
        (0, response_1.SuccessResponse)(res, { Zones: zonesWithShifts }, 200);
    }
    catch (error) {
        console.error("Error fetching zones:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getAllZones = getAllZones;
const createZone = async (req, res) => {
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
        await db_1.db.insert(schema_1.zones).values({
            name,
            locations: locations || [],
            status: status !== undefined ? status : true,
            router_mac_status: effectiveMacStatus,
            router_mac: effectiveMac
        });
        (0, response_1.SuccessResponse)(res, { message: "Zone created successfully" }, 201);
    }
    catch (error) {
        console.error("Error creating zone:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.createZone = createZone;
const updateZone = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, locations, status, router_mac_status, router_mac, mac_status, mac_address } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, message: "Zone ID is required" });
        }
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (locations !== undefined)
            updateData.locations = locations;
        if (status !== undefined)
            updateData.status = status;
        if (router_mac_status !== undefined) {
            updateData.router_mac_status = Boolean(router_mac_status);
        }
        else if (mac_status !== undefined) {
            updateData.router_mac_status = Boolean(mac_status);
        }
        if (router_mac !== undefined) {
            updateData.router_mac = (router_mac || "").trim() || null;
        }
        else if (mac_address !== undefined) {
            updateData.router_mac = (mac_address || "").trim() || null;
        }
        await db_1.db.update(schema_1.zones).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.zones.id, id));
        (0, response_1.SuccessResponse)(res, { message: "Zone updated successfully" }, 200);
    }
    catch (error) {
        console.error("Error updating zone:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.updateZone = updateZone;
const deleteZone = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: "Zone ID is required" });
        }
        await db_1.db.delete(schema_1.zones).where((0, drizzle_orm_1.eq)(schema_1.zones.id, id));
        (0, response_1.SuccessResponse)(res, { message: "Zone deleted successfully" }, 200);
    }
    catch (error) {
        console.error("Error deleting zone:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.deleteZone = deleteZone;
