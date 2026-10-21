"use strict";
// src/controllers/admin/sales/statusRequests.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeStatus = exports.getHistoryRequest = exports.getPendingRequest = exports.getRequestsSchema = exports.requestIdSchema = void 0;
const db_1 = require("../../../models/db");
const schema_1 = require("../../../models/schema");
const response_1 = require("../../../utils/response");
const NotFound_1 = require("../../../Errors/NotFound");
const zod_1 = require("zod");
const drizzle_orm_1 = require("drizzle-orm");
const visits_1 = require("./visits");
const helpers_1 = require("./helpers");
// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
exports.requestIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required in parameters" }).uuid("Invalid ID format"),
    }),
    body: zod_1.z.object({
        status: zod_1.z.enum(["approve", "reject"], {
            required_error: "Action status is required",
            invalid_type_error: "Status must be either 'approve' or 'reject'",
        }),
    }),
});
exports.getRequestsSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().positive().optional(),
        limit: zod_1.z.coerce.number().int().positive().optional(),
        search: zod_1.z.string().optional(),
    }),
});
// ==========================================
// 🎮 Controllers
// ==========================================
// ✅ Get Pending Requests
const getPendingRequest = async (req, res) => {
    await exports.getRequestsSchema.parseAsync({ query: req.query });
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const search = (req.query.search || '').trim();
    const projectId = (0, helpers_1.getProjectId)(req);
    const offset = (page - 1) * limit;
    const baseCondition = (0, drizzle_orm_1.eq)(schema_1.statusRequest.status, 'pending');
    const projectCondition = projectId ? (0, drizzle_orm_1.eq)(schema_1.statusRequest.sales_project_id, projectId) : undefined;
    const leaderCondition = (req.user && (0, helpers_1.isLeader)(req.user.role))
        ? (0, drizzle_orm_1.eq)(schema_1.users.leader_id, req.user.id)
        : undefined;
    const searchCondition = search
        ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.users.name, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.users.phone, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.visits.name, `%${search}%`))
        : undefined;
    const whereClause = (0, drizzle_orm_1.and)(baseCondition, leaderCondition, searchCondition, projectCondition);
    const pendingRequests = await db_1.db
        .select({
        id: schema_1.statusRequest.id,
        user_name: schema_1.users.name,
        user_phone: schema_1.users.phone,
        visit_name: schema_1.visits.name,
        from: schema_1.statusRequest.from,
        to: schema_1.statusRequest.to,
        status: schema_1.statusRequest.status,
        createdAt: schema_1.statusRequest.createdAt,
    })
        .from(schema_1.statusRequest)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.statusRequest.userId, schema_1.users.id))
        .leftJoin(schema_1.visits, (0, drizzle_orm_1.eq)(schema_1.statusRequest.visitId, schema_1.visits.id))
        .where(whereClause)
        .orderBy((0, drizzle_orm_1.desc)(schema_1.statusRequest.createdAt))
        .limit(limit)
        .offset(offset);
    const [{ total }] = await db_1.db
        .select({ total: (0, drizzle_orm_1.count)() })
        .from(schema_1.statusRequest)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.statusRequest.userId, schema_1.users.id))
        .leftJoin(schema_1.visits, (0, drizzle_orm_1.eq)(schema_1.statusRequest.visitId, schema_1.visits.id))
        .where(whereClause);
    const totalPages = Math.ceil(total / limit);
    (0, response_1.SuccessResponse)(res, {
        pendingRequests,
        pagination: {
            totalItems: total,
            totalPages,
            currentPage: page,
            limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    }, 200);
};
exports.getPendingRequest = getPendingRequest;
// ✅ Get History Requests
const getHistoryRequest = async (req, res) => {
    await exports.getRequestsSchema.parseAsync({ query: req.query });
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const search = (req.query.search || '').trim();
    const projectId = (0, helpers_1.getProjectId)(req);
    const offset = (page - 1) * limit;
    const baseCondition = (0, drizzle_orm_1.ne)(schema_1.statusRequest.status, 'pending');
    const projectCondition = projectId ? (0, drizzle_orm_1.eq)(schema_1.statusRequest.sales_project_id, projectId) : undefined;
    const leaderCondition = (req.user && (0, helpers_1.isLeader)(req.user.role))
        ? (0, drizzle_orm_1.eq)(schema_1.users.leader_id, req.user.id)
        : undefined;
    const searchCondition = search
        ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.users.name, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.users.phone, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.visits.name, `%${search}%`))
        : undefined;
    const whereClause = (0, drizzle_orm_1.and)(baseCondition, leaderCondition, searchCondition, projectCondition);
    const historyRequests = await db_1.db
        .select({
        id: schema_1.statusRequest.id,
        user_name: schema_1.users.name,
        user_phone: schema_1.users.phone,
        visit_name: schema_1.visits.name,
        from: schema_1.statusRequest.from,
        to: schema_1.statusRequest.to,
        status: schema_1.statusRequest.status,
        createdAt: schema_1.statusRequest.createdAt,
    })
        .from(schema_1.statusRequest)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.statusRequest.userId, schema_1.users.id))
        .leftJoin(schema_1.visits, (0, drizzle_orm_1.eq)(schema_1.statusRequest.visitId, schema_1.visits.id))
        .where(whereClause)
        .orderBy((0, drizzle_orm_1.desc)(schema_1.statusRequest.createdAt))
        .limit(limit)
        .offset(offset);
    const [{ total }] = await db_1.db
        .select({ total: (0, drizzle_orm_1.count)() })
        .from(schema_1.statusRequest)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.statusRequest.userId, schema_1.users.id))
        .leftJoin(schema_1.visits, (0, drizzle_orm_1.eq)(schema_1.statusRequest.visitId, schema_1.visits.id))
        .where(whereClause);
    const totalPages = Math.ceil(total / limit);
    (0, response_1.SuccessResponse)(res, {
        historyRequests,
        pagination: {
            totalItems: total,
            totalPages,
            currentPage: page,
            limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    }, 200);
};
exports.getHistoryRequest = getHistoryRequest;
// ✅ Change Request Status
const changeStatus = async (req, res) => {
    const validated = await exports.requestIdSchema.parseAsync({ params: req.params, body: req.body });
    const id = validated.params.id;
    const status = validated.body.status;
    const existRequest = await db_1.db.select({
        id: schema_1.statusRequest.id,
        from: schema_1.statusRequest.from,
        to: schema_1.statusRequest.to,
        visitId: schema_1.statusRequest.visitId,
    })
        .from(schema_1.statusRequest)
        .where((0, drizzle_orm_1.eq)(schema_1.statusRequest.id, id))
        .limit(1);
    if (!existRequest.length) {
        throw new NotFound_1.NotFound("Request not found");
    }
    await db_1.db.update(schema_1.statusRequest)
        .set({ status })
        .where((0, drizzle_orm_1.eq)(schema_1.statusRequest.id, id));
    if (status === "approve") {
        const visitUpdateData = { status: existRequest[0].to };
        if (existRequest[0].to === "sales" || existRequest[0].to === "delivered") {
            const visit = await db_1.db.select().from(schema_1.visits).where((0, drizzle_orm_1.eq)(schema_1.visits.id, existRequest[0].visitId)).limit(1);
            if (visit[0] && visit[0].products) {
                const parsedProducts = (0, visits_1.parseProductsArray)(visit[0].products);
                visitUpdateData.points = await (0, visits_1.calculatePointsForProducts)(parsedProducts);
            }
        }
        else {
            visitUpdateData.points = 0;
        }
        await db_1.db.update(schema_1.visits)
            .set(visitUpdateData)
            .where((0, drizzle_orm_1.eq)(schema_1.visits.id, existRequest[0].visitId));
    }
    (0, response_1.SuccessResponse)(res, { message: "Status updated successfully" }, 200);
};
exports.changeStatus = changeStatus;
