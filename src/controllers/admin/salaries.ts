import { Request, Response } from "express";
import { db } from "../../models/db";
import { salaries, users } from "../../models/schema"; 
import { eq } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";

export const getAllSalaries = async (req: Request, res: Response) => {
    try {
        const salariesList = await db
            .select({
                id: salaries.id,
                user_id: salaries.user_id,
                salary: salaries.salary,
                createdAt: salaries.createdAt,
                updatedAt: salaries.updatedAt,
                userName: users.name,
                userEmail: users.email
            })
            .from(salaries)
            .leftJoin(users, eq(salaries.user_id, users.id));

        SuccessResponse(res, { Salaries: salariesList }, 200);
    } catch (error) {
        console.error("Error fetching salaries:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getSalaryById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const salaryItem = await db
            .select({
                id: salaries.id,
                user_id: salaries.user_id,
                salary: salaries.salary,
                createdAt: salaries.createdAt,
                updatedAt: salaries.updatedAt,
                userName: users.name,
                userEmail: users.email
            })
            .from(salaries)
            .leftJoin(users, eq(salaries.user_id, users.id))
            .where(eq(salaries.id, id));

        if (!salaryItem.length) {
            return res.status(404).json({ success: false, message: "Salary not found" });
        }

        SuccessResponse(res, { Salary: salaryItem[0] }, 200);
    } catch (error) {
        console.error("Error fetching salary:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const createSalary = async (req: Request, res: Response) => {
    try {
        const { user_id, salary } = req.body;
        
        if (!user_id || salary === undefined) {
            return res.status(400).json({ success: false, message: "user_id and salary are required" });
        }

        await db.insert(salaries).values({
            user_id,
            salary: Number(salary)
        });

        SuccessResponse(res, { message: "Salary created successfully" }, 201);
    } catch (error) {
        console.error("Error creating salary:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updateSalary = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { user_id, salary } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: "Salary ID is required" });
        }

        const updateData: any = {};
        if (user_id !== undefined) updateData.user_id = user_id;
        if (salary !== undefined) updateData.salary = Number(salary);

        await db.update(salaries).set(updateData).where(eq(salaries.id, id));

        SuccessResponse(res, { message: "Salary updated successfully" }, 200);
    } catch (error) {
        console.error("Error updating salary:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const deleteSalary = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: false, message: "Salary ID is required" });
        }

        await db.delete(salaries).where(eq(salaries.id, id));

        SuccessResponse(res, { message: "Salary deleted successfully" }, 200);
    } catch (error) {
        console.error("Error deleting salary:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
