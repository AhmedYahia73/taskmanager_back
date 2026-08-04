import { Request, Response } from "express";
import { db } from "../../models/db";
import { deductions, users } from "../../models/schema";
import { eq } from "drizzle-orm";

// Get all deductions
export const getDeductions = async (req: Request, res: Response): Promise<void> => {
  try {
    const allDeductions = await db
      .select({
        id: deductions.id,
        userId: deductions.userId,
        userName: users.name,
        type: deductions.type,
        amount: deductions.amount,
        month: deductions.month,
        year: deductions.year,
        createdAt: deductions.createdAt,
      })
      .from(deductions)
      .leftJoin(users, eq(deductions.userId, users.id));

    res.status(200).json({ success: true, deductions: allDeductions });
  } catch (error) {
    console.error("Error fetching deductions:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Create a new deduction
export const createDeduction = async (req: Request, res: Response): Promise<void> => {
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

    await db.insert(deductions).values({
      userId,
      type,
      amount,
      month,
      year,
    });

    res.status(201).json({ success: true, message: "Deduction created successfully" });
  } catch (error) {
    console.error("Error creating deduction:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Update an existing deduction
export const updateDeduction = async (req: Request, res: Response): Promise<void> => {
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

    await db
      .update(deductions)
      .set({
        userId,
        type,
        amount,
        month,
        year,
      })
      .where(eq(deductions.id, id));

    res.status(200).json({ success: true, message: "Deduction updated successfully" });
  } catch (error) {
    console.error("Error updating deduction:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Delete a deduction
export const deleteDeduction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await db.delete(deductions).where(eq(deductions.id, id));

    res.status(200).json({ success: true, message: "Deduction deleted successfully" });
  } catch (error) {
    console.error("Error deleting deduction:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
