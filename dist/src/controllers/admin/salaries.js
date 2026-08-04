"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSalary = exports.updateSalary = exports.createSalary = exports.getSalaryById = exports.getAllSalaries = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const getAllSalaries = async (req, res) => {
    try {
        const salariesList = await db_1.db
            .select({
            id: schema_1.salaries.id,
            user_id: schema_1.salaries.user_id,
            salary: schema_1.salaries.salary,
            createdAt: schema_1.salaries.createdAt,
            updatedAt: schema_1.salaries.updatedAt,
            userName: schema_1.users.name,
            userEmail: schema_1.users.email
        })
            .from(schema_1.salaries)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.salaries.user_id, schema_1.users.id));
        (0, response_1.SuccessResponse)(res, { Salaries: salariesList }, 200);
    }
    catch (error) {
        console.error("Error fetching salaries:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getAllSalaries = getAllSalaries;
const getSalaryById = async (req, res) => {
    try {
        const { id } = req.params;
        const salaryItem = await db_1.db
            .select({
            id: schema_1.salaries.id,
            user_id: schema_1.salaries.user_id,
            salary: schema_1.salaries.salary,
            createdAt: schema_1.salaries.createdAt,
            updatedAt: schema_1.salaries.updatedAt,
            userName: schema_1.users.name,
            userEmail: schema_1.users.email
        })
            .from(schema_1.salaries)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.salaries.user_id, schema_1.users.id))
            .where((0, drizzle_orm_1.eq)(schema_1.salaries.id, id));
        if (!salaryItem.length) {
            return res.status(404).json({ success: false, message: "Salary not found" });
        }
        (0, response_1.SuccessResponse)(res, { Salary: salaryItem[0] }, 200);
    }
    catch (error) {
        console.error("Error fetching salary:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getSalaryById = getSalaryById;
const createSalary = async (req, res) => {
    try {
        const { user_id, salary } = req.body;
        if (!user_id || salary === undefined) {
            return res.status(400).json({ success: false, message: "user_id and salary are required" });
        }
        await db_1.db.insert(schema_1.salaries).values({
            user_id,
            salary: Number(salary)
        });
        (0, response_1.SuccessResponse)(res, { message: "Salary created successfully" }, 201);
    }
    catch (error) {
        console.error("Error creating salary:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.createSalary = createSalary;
const updateSalary = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, salary } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, message: "Salary ID is required" });
        }
        const updateData = {};
        if (user_id !== undefined)
            updateData.user_id = user_id;
        if (salary !== undefined)
            updateData.salary = Number(salary);
        await db_1.db.update(schema_1.salaries).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.salaries.id, id));
        (0, response_1.SuccessResponse)(res, { message: "Salary updated successfully" }, 200);
    }
    catch (error) {
        console.error("Error updating salary:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.updateSalary = updateSalary;
const deleteSalary = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: "Salary ID is required" });
        }
        await db_1.db.delete(schema_1.salaries).where((0, drizzle_orm_1.eq)(schema_1.salaries.id, id));
        (0, response_1.SuccessResponse)(res, { message: "Salary deleted successfully" }, 200);
    }
    catch (error) {
        console.error("Error deleting salary:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.deleteSalary = deleteSalary;
