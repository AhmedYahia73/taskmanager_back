import { Request, Response } from "express";
import { db } from "../../models/db";
import { bonuses, users } from "../../models/schema";
import { eq } from "drizzle-orm";

// Get all bonuses
export const getBonuses = async (req: Request, res: Response): Promise<void> => {
  try {
    const allBonuses = await db
      .select({
        id: bonuses.id,
        userId: bonuses.userId,
        userName: users.name,
        type: bonuses.type,
        amount: bonuses.amount,
        month: bonuses.month,
        year: bonuses.year,
        createdAt: bonuses.createdAt,
      })
      .from(bonuses)
      .leftJoin(users, eq(bonuses.userId, users.id));

    res.status(200).json({ success: true, bonuses: allBonuses });
  } catch (error) {
    console.error("Error fetching bonuses:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Create a new bonus
export const createBonus = async (req: Request, res: Response): Promise<void> => {
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

    await db.insert(bonuses).values({
      userId,
      type,
      amount,
      month,
      year,
    });

    res.status(201).json({ success: true, message: "Bonus created successfully" });
  } catch (error) {
    console.error("Error creating bonus:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Update an existing bonus
export const updateBonus = async (req: Request, res: Response): Promise<void> => {
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
      .update(bonuses)
      .set({
        userId,
        type,
        amount,
        month,
        year,
      })
      .where(eq(bonuses.id, id));

    res.status(200).json({ success: true, message: "Bonus updated successfully" });
  } catch (error) {
    console.error("Error updating bonus:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Delete a bonus
export const deleteBonus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await db.delete(bonuses).where(eq(bonuses.id, id));

    res.status(200).json({ success: true, message: "Bonus deleted successfully" });
  } catch (error) {
    console.error("Error deleting bonus:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
