"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDeduction = exports.updateDeduction = exports.createDeduction = exports.getDeductions = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
// Get all deductions
const getDeductions = async (req, res) => {
    try {
        const allDeductions = await db_1.db
            .select({
            id: schema_1.deductions.id,
            userId: schema_1.deductions.userId,
            userName: schema_1.users.name,
            type: schema_1.deductions.type,
            amount: schema_1.deductions.amount,
            month: schema_1.deductions.month,
            year: schema_1.deductions.year,
            createdAt: schema_1.deductions.createdAt,
        })
            .from(schema_1.deductions)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.deductions.userId, schema_1.users.id));
        res.status(200).json({ success: true, deductions: allDeductions });
    }
    catch (error) {
        console.error("Error fetching deductions:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.getDeductions = getDeductions;
// Create a new deduction
const createDeduction = async (req, res) => {
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
        await db_1.db.insert(schema_1.deductions).values({
            userId,
            type,
            amount,
            month,
            year,
        });
        res.status(201).json({ success: true, message: "Deduction created successfully" });
    }
    catch (error) {
        console.error("Error creating deduction:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.createDeduction = createDeduction;
// Update an existing deduction
const updateDeduction = async (req, res) => {
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
            .update(schema_1.deductions)
            .set({
            userId,
            type,
            amount,
            month,
            year,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.deductions.id, id));
        res.status(200).json({ success: true, message: "Deduction updated successfully" });
    }
    catch (error) {
        console.error("Error updating deduction:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.updateDeduction = updateDeduction;
// Delete a deduction
const deleteDeduction = async (req, res) => {
    try {
        const { id } = req.params;
        await db_1.db.delete(schema_1.deductions).where((0, drizzle_orm_1.eq)(schema_1.deductions.id, id));
        res.status(200).json({ success: true, message: "Deduction deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting deduction:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.deleteDeduction = deleteDeduction;
