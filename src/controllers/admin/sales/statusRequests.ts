// src/controllers/admin/sales/statusRequests.ts

import { Request, Response } from "express";
import { db } from "../../../models/db";
import { statusRequest, visits, users, products } from "../../../models/schema"; 
import { SuccessResponse } from "../../../utils/response";
import { NotFound } from "../../../Errors/NotFound";
import { z } from "zod"; 
import { eq, desc, or, like, count, and, ne, SQL } from 'drizzle-orm';
import { calculatePointsForProducts, parseProductsArray } from "./visits";
import { getProjectId, isLeader, isSales } from "./helpers";
import { notifyUser } from "../../../services/notificationService";

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================

export const requestIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required in parameters" }).uuid("Invalid ID format"),
  }),
  body: z.object({ 
    status: z.enum(["approve", "reject"], {
      required_error: "Action status is required",
      invalid_type_error: "Status must be either 'approve' or 'reject'",
    }),
  }),
});

export const getRequestsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
  }),
});

// ==========================================
// 🎮 Controllers
// ==========================================

// ✅ Get Pending Requests
export const getPendingRequest = async (req: Request, res: Response) => {
    await getRequestsSchema.parseAsync({ query: req.query });
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const search = (req.query.search as string || '').trim();
    const projectId = getProjectId(req);

    const offset = (page - 1) * limit;

    const baseCondition = eq(statusRequest.status, 'pending');
    const projectCondition = projectId ? eq(statusRequest.sales_project_id, projectId) : undefined;

    let roleCondition: SQL | undefined = undefined;
    if (req.user && isLeader(req.user.role)) {
        roleCondition = or(eq(users.leader_id, req.user.id), eq(statusRequest.userId, req.user.id));
    } else if (req.user && isSales(req.user.role)) {
        roleCondition = eq(statusRequest.userId, req.user.id);
    }

    const searchCondition = search
        ? or(
            like(users.name, `%${search}%`),
            like(users.phone, `%${search}%`),
            like(visits.name, `%${search}%`)
          )
        : undefined;

    const whereClause = and(baseCondition, roleCondition, searchCondition, projectCondition);

    const pendingRequests = await db
        .select({
            id: statusRequest.id,
            user_name: users.name,
            user_phone: users.phone,
            visit_name: visits.name,
            from: statusRequest.from,
            to: statusRequest.to,
            status: statusRequest.status,
            createdAt: statusRequest.createdAt,
        })
        .from(statusRequest)
        .leftJoin(users, eq(statusRequest.userId, users.id))
        .leftJoin(visits, eq(statusRequest.visitId, visits.id))
        .where(whereClause)
        .orderBy(desc(statusRequest.createdAt))
        .limit(limit)
        .offset(offset);

    const [{ total }] = await db
        .select({ total: count() })
        .from(statusRequest)
        .leftJoin(users, eq(statusRequest.userId, users.id))
        .leftJoin(visits, eq(statusRequest.visitId, visits.id))
        .where(whereClause);

    const totalPages = Math.ceil(total / limit);

    SuccessResponse(res, {
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

// ✅ Get History Requests
export const getHistoryRequest = async (req: Request, res: Response) => {
    await getRequestsSchema.parseAsync({ query: req.query });
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const search = (req.query.search as string || '').trim();
    const projectId = getProjectId(req);

    const offset = (page - 1) * limit;

    const baseCondition = ne(statusRequest.status, 'pending');
    const projectCondition = projectId ? eq(statusRequest.sales_project_id, projectId) : undefined;

    let roleCondition: SQL | undefined = undefined;
    if (req.user && isLeader(req.user.role)) {
        roleCondition = or(eq(users.leader_id, req.user.id), eq(statusRequest.userId, req.user.id));
    } else if (req.user && isSales(req.user.role)) {
        roleCondition = eq(statusRequest.userId, req.user.id);
    }

    const searchCondition = search
        ? or(
            like(users.name, `%${search}%`),
            like(users.phone, `%${search}%`),
            like(visits.name, `%${search}%`)
          )
        : undefined;

    const whereClause = and(baseCondition, roleCondition, searchCondition, projectCondition);

    const historyRequests = await db
        .select({
            id: statusRequest.id,
            user_name: users.name,
            user_phone: users.phone,
            visit_name: visits.name,
            from: statusRequest.from,
            to: statusRequest.to,
            status: statusRequest.status,
            createdAt: statusRequest.createdAt,
        })
        .from(statusRequest)
        .leftJoin(users, eq(statusRequest.userId, users.id))
        .leftJoin(visits, eq(statusRequest.visitId, visits.id))
        .where(whereClause)
        .orderBy(desc(statusRequest.createdAt))
        .limit(limit)
        .offset(offset);

    const [{ total }] = await db
        .select({ total: count() })
        .from(statusRequest)
        .leftJoin(users, eq(statusRequest.userId, users.id))
        .leftJoin(visits, eq(statusRequest.visitId, visits.id))
        .where(whereClause);

    const totalPages = Math.ceil(total / limit);

    SuccessResponse(res, {
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

// ✅ Change Request Status
export const changeStatus = async (req: Request, res: Response) => {
    const validated = await requestIdSchema.parseAsync({ params: req.params, body: req.body });
    const id = validated.params.id;
    const status = validated.body.status;

    const existRequest = await db.select({
        id: statusRequest.id,
        from: statusRequest.from,
        to: statusRequest.to,
        visitId: statusRequest.visitId,
        userId: statusRequest.userId,
    })
    .from(statusRequest)
    .where(eq(statusRequest.id, id))
    .limit(1);
    if (!existRequest.length) {
        throw new NotFound("Request not found");
    }

    await db.update(statusRequest)
        .set({ status })
        .where(eq(statusRequest.id, id));

    // 👤 Notify the user who requested the status change
    if (existRequest[0].userId) {
        await notifyUser(existRequest[0].userId, {
            type: "status_request_status",
            description: `Your status change request to "${existRequest[0].to}" has been ${status === 'approve' ? 'approved' : 'rejected'}.`,
            link: "/requests"
        });
    }
    if (status === "approve") { 
        const visitUpdateData: any = { status: existRequest[0].to };
        
        if (existRequest[0].to === "sales" || existRequest[0].to === "delivered") {
            const visit = await db.select().from(visits).where(eq(visits.id, existRequest[0].visitId)).limit(1);
            if (visit[0] && visit[0].products) {
                const parsedProducts = parseProductsArray(visit[0].products);
                visitUpdateData.points = await calculatePointsForProducts(parsedProducts);
            }
        } else {
            visitUpdateData.points = 0;
        }
        
        await db.update(visits)
        .set(visitUpdateData)
        .where(eq(visits.id, existRequest[0].visitId));
    }

    SuccessResponse(res, { message: "Status updated successfully" }, 200);
};
