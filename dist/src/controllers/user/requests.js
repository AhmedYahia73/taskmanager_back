"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyExtraTimeRequests = exports.submitExtraTimeRequest = exports.submitPermission = exports.submitOnlineRequest = exports.submitHolidayRequest = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const response_1 = require("../../utils/response");
const socket_1 = require("../../socket");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const baseRequestSchema = zod_1.z.object({
    body: zod_1.z.object({
        date: zod_1.z.string({ required_error: "Date is required" }),
    })
});
const permissionSchema = zod_1.z.object({
    body: zod_1.z.object({
        date: zod_1.z.string({ required_error: "Date is required" }),
        hours: zod_1.z.number({ required_error: "Hours are required" }).min(0.5),
        reason: zod_1.z.string().optional(),
    })
});
const extraTimeSchema = zod_1.z.object({
    body: zod_1.z.object({
        date: zod_1.z.string({ required_error: "Date is required" }),
        early_attend: zod_1.z.boolean().optional().default(false),
        late_leave: zod_1.z.boolean().optional().default(false),
    }).refine((data) => data.early_attend || data.late_leave, {
        message: "At least one of early_attend or late_leave must be true",
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
// 📌 Submit Extra Time Request (طلب وقت إضافي: حضور مبكر أو انصراف متأخر)
const submitExtraTimeRequest = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const validated = await extraTimeSchema.parseAsync({ body: req.body });
        const { date, early_attend, late_leave } = validated.body;
        const [inserted] = await db_1.db.insert(schema_1.extraTimeRequests).values({
            userId,
            date: new Date(date),
            early_attend,
            late_leave,
            status: "pending"
        });
        // Fetch user name for notification
        const [u] = await db_1.db.select({ name: schema_1.users.name }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
        const userName = u?.name || "Employee";
        const typeLabels = [];
        if (early_attend)
            typeLabels.push("Early Attend");
        if (late_leave)
            typeLabels.push("Late Leave");
        const typeStr = typeLabels.join(" & ");
        // Alert admins via real-time socket
        try {
            (0, socket_1.sendNotificationToAdmins)({
                target: "admin",
                type: "extra_time_request",
                link: "/admin/hrm/extra-time-requests",
                description: `${userName} submitted an extra time request (${typeStr}) for ${date}`,
                created_at: new Date().toISOString()
            });
        }
        catch (e) {
            console.error("Socket error on extra time request:", e);
        }
        (0, response_1.SuccessResponse)(res, { message: "Extra time request submitted successfully" }, 201);
    }
    catch (error) {
        console.error("Error submitting extra time request:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, message: error.errors[0]?.message || "Validation Error" });
        }
        res.status(500).json({ success: false, message: error?.message || "Internal Server Error" });
    }
};
exports.submitExtraTimeRequest = submitExtraTimeRequest;
// 📌 Get Logged-in User's Extra Time Requests
const getMyExtraTimeRequests = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const records = await db_1.db.select()
            .from(schema_1.extraTimeRequests)
            .where((0, drizzle_orm_1.eq)(schema_1.extraTimeRequests.userId, userId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.extraTimeRequests.date));
        (0, response_1.SuccessResponse)(res, { data: records }, 200);
    }
    catch (error) {
        console.error("Error fetching my extra time requests:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getMyExtraTimeRequests = getMyExtraTimeRequests;
