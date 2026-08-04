"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBonus = exports.updateBonus = exports.createBonus = exports.getBonuses = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
// Get all bonuses
const getBonuses = async (req, res) => {
    try {
        const allBonuses = await db_1.db
            .select({
            id: schema_1.bonuses.id,
            userId: schema_1.bonuses.userId,
            userName: schema_1.users.name,
            type: schema_1.bonuses.type,
            amount: schema_1.bonuses.amount,
            month: schema_1.bonuses.month,
            year: schema_1.bonuses.year,
            createdAt: schema_1.bonuses.createdAt,
        })
            .from(schema_1.bonuses)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.bonuses.userId, schema_1.users.id));
        res.status(200).json({ success: true, bonuses: allBonuses });
    }
    catch (error) {
        console.error("Error fetching bonuses:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.getBonuses = getBonuses;
// Create a new bonus
const createBonus = async (req, res) => {
    try {
        const { userId, type, amount, month, year } = req.body;
        if (!userId || !type || !amount || !month || !year) {
            res.status(400).json({ success: false, message: "All fields are required" });
            return;
        }
        const currentYear = new Date().getFullYear();
        if (year < currentYear) {
            res.status(400).json({ success: false, message: "Year cannot be in the past" });
            return;
        }
        await db_1.db.insert(schema_1.bonuses).values({
            userId,
            type,
            amount,
            month,
            year,
        });
        res.status(201).json({ success: true, message: "Bonus created successfully" });
    }
    catch (error) {
        console.error("Error creating bonus:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.createBonus = createBonus;
// Update an existing bonus
const updateBonus = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, type, amount, month, year } = req.body;
        if (!userId || !type || !amount || !month || !year) {
            res.status(400).json({ success: false, message: "All fields are required" });
            return;
        }
        const currentYear = new Date().getFullYear();
        if (year < currentYear) {
            res.status(400).json({ success: false, message: "Year cannot be in the past" });
            return;
        }
        await db_1.db
            .update(schema_1.bonuses)
            .set({
            userId,
            type,
            amount,
            month,
            year,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.bonuses.id, id));
        res.status(200).json({ success: true, message: "Bonus updated successfully" });
    }
    catch (error) {
        console.error("Error updating bonus:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.updateBonus = updateBonus;
// Delete a bonus
const deleteBonus = async (req, res) => {
    try {
        const { id } = req.params;
        await db_1.db.delete(schema_1.bonuses).where((0, drizzle_orm_1.eq)(schema_1.bonuses.id, id));
        res.status(200).json({ success: true, message: "Bonus deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting bonus:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.deleteBonus = deleteBonus;
