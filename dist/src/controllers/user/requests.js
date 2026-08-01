"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitPermission = exports.submitOnlineRequest = exports.submitHolidayRequest = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const response_1 = require("../../utils/response");
const zod_1 = require("zod");
const baseRequestSchema = zod_1.z.object({
    body: zod_1.z.object({
        date: zod_1.z.string({ required_error: "Date is required" }),
    })
});
const permissionSchema = zod_1.z.object({
    body: zod_1.z.object({
        date: zod_1.z.string({ required_error: "Date is required" }),
        hours: zod_1.z.number({ required_error: "Hours are required" }).min(1),
        reason: zod_1.z.string().optional(),
    })
});
const submitHolidayRequest = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const validated = await baseRequestSchema.parseAsync({ body: req.body });
        await db_1.db.insert(schema_1.holidayRequests).values({
            userId,
            date: new Date(validated.body.date),
            status: "pending"
        });
        (0, response_1.SuccessResponse)(res, { message: "Holiday request submitted successfully" }, 201);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.submitHolidayRequest = submitHolidayRequest;
const submitOnlineRequest = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const validated = await baseRequestSchema.parseAsync({ body: req.body });
        await db_1.db.insert(schema_1.onlineRequests).values({
            userId,
            date: new Date(validated.body.date),
            status: "pending"
        });
        (0, response_1.SuccessResponse)(res, { message: "Online request submitted successfully" }, 201);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.submitOnlineRequest = submitOnlineRequest;
const submitPermission = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const validated = await permissionSchema.parseAsync({ body: req.body });
        await db_1.db.insert(schema_1.permissions).values({
            userId,
            date: new Date(validated.body.date),
            hours: validated.body.hours,
            reason: validated.body.reason || "",
            status: "pending"
        });
        (0, response_1.SuccessResponse)(res, { message: "Permission request submitted successfully" }, 201);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.submitPermission = submitPermission;
