"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteShift = exports.updateShift = exports.createShift = exports.getAllShifts = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const getAllShifts = async (req, res) => {
    try {
        const allShifts = await db_1.db.select({
            id: schema_1.shifts.id,
            name: schema_1.shifts.name,
            zone_id: schema_1.shifts.zone_id,
            from: schema_1.shifts.from,
            to: schema_1.shifts.to,
            zone_name: schema_1.zones.name
        })
            .from(schema_1.shifts)
            .leftJoin(schema_1.zones, (0, drizzle_orm_1.eq)(schema_1.shifts.zone_id, schema_1.zones.id));
        (0, response_1.SuccessResponse)(res, { Shifts: allShifts }, 200);
    }
    catch (error) {
        console.error("Error fetching shifts:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getAllShifts = getAllShifts;
const createShift = async (req, res) => {
    try {
        const { name, zone_id, from, to } = req.body;
        if (!name || !zone_id || !from || !to) {
            return res.status(400).json({ success: false, message: "Name, zone_id, from, and to are required" });
        }
        // We assume from and to are provided as standard time strings like '09:00'
        // The DB expects a valid date/datetime string. We'll format it.
        const fromDate = new Date(`1970-01-01T${from}:00Z`);
        const toDate = new Date(`1970-01-01T${to}:00Z`);
        await db_1.db.insert(schema_1.shifts).values({
            name,
            zone_id,
            from: fromDate,
            to: toDate,
        });
        (0, response_1.SuccessResponse)(res, { message: "Shift created successfully" }, 201);
    }
    catch (error) {
        console.error("Error creating shift:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.createShift = createShift;
const updateShift = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, zone_id, from, to } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, message: "Shift ID is required" });
        }
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (zone_id !== undefined)
            updateData.zone_id = zone_id;
        if (from !== undefined) {
            updateData.from = new Date(`1970-01-01T${from}:00Z`);
        }
        if (to !== undefined) {
            updateData.to = new Date(`1970-01-01T${to}:00Z`);
        }
        await db_1.db.update(schema_1.shifts).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.shifts.id, id));
        (0, response_1.SuccessResponse)(res, { message: "Shift updated successfully" }, 200);
    }
    catch (error) {
        console.error("Error updating shift:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.updateShift = updateShift;
const deleteShift = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: "Shift ID is required" });
        }
        await db_1.db.delete(schema_1.shifts).where((0, drizzle_orm_1.eq)(schema_1.shifts.id, id));
        (0, response_1.SuccessResponse)(res, { message: "Shift deleted successfully" }, 200);
    }
    catch (error) {
        console.error("Error deleting shift:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.deleteShift = deleteShift;
