// src/controllers/admin/sales/dashboard.ts

import { Request, Response } from "express";
import { db } from "../../../models/db";
import { visitStatus, visits, target_sales, targets, target_items, users } from "../../../models/schema";
import { BadRequest } from "../../../Errors/BadRequest";
import { and, or, inArray, eq, gte, lte, gt, lt, count, sql, SQL } from "drizzle-orm";
import { SuccessResponse } from "../../../utils/response";
import { z } from "zod";
import { isLeader, isSales } from "./helpers";

export const dashboardQuerySchema = z.object({
  query: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

// ==========================================
// 🎮 Controllers
// ==========================================
export const viewDashboard = async (req: Request, res: Response) => {
  const role = req.user?.role;
  const userId = req.user?.id;
  const projectId = (req.salesProjectId || req.headers["x-sales-project-id"] || req.user?.project_id) as string;

  if (!userId) {
    throw new BadRequest("User not authenticated.");
  }

  const validated = await dashboardQuerySchema.parseAsync({ query: req.query });
  const { from, to } = validated.query;

  // 1. إعداد شروط التاريخ لجدول الزيارات (visits.createdAt)
  const visitDateConditions = [];
  if (from) {
    visitDateConditions.push(gte(visits.createdAt, new Date(from)));
  }
  if (to) {
    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);
    visitDateConditions.push(lte(visits.createdAt, endDate));
  }

  // 2. إعداد شروط التاريخ لجدول التارجت (target_items.year & target_items.month)
  const targetDateConditions = [];
  if (from) {
    const fromDate = new Date(from);
    const fromYear = fromDate.getFullYear();
    const fromMonth = fromDate.getMonth() + 1;

    targetDateConditions.push(
      or(
        gt(target_items.year, fromYear),
        and(eq(target_items.year, fromYear), gte(target_items.month, fromMonth))
      )
    );
  }
  if (to) {
    const toDate = new Date(to);
    const toYear = toDate.getFullYear();
    const toMonth = toDate.getMonth() + 1;

    targetDateConditions.push(
      or(
        lt(target_items.year, toYear),
        and(eq(target_items.year, toYear), lte(target_items.month, toMonth))
      )
    );
  }

  // 3. جلب معرفات المبيعات التابعين للقائد
  let sales_ids: string[] = [];
  if (isLeader(role)) {
    const salesList = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "sales"), eq(users.leader_id, userId)));
    sales_ids = [...salesList.map((item) => item.id), userId];
  }

  // 4. بناء شروط الـ Join / Filtering
  const joinConditions: SQL[] = [eq(visits.status_id, visitStatus.id)];
  if (projectId) {
    joinConditions.push(eq(visits.sales_project_id, projectId));
  }

  if (isSales(role)) {
    joinConditions.push(eq(visits.sales_id, userId));
  } else if (isLeader(role)) {
    if (sales_ids.length > 0) {
      joinConditions.push(inArray(visits.sales_id, sales_ids));
    } else {
      joinConditions.push(sql`1 = 0`);
    }
  }

  if (visitDateConditions.length > 0) {
    joinConditions.push(...visitDateConditions);
  }

  // 5. جلب الحالات النشطة وعد الزيارات المربوطة بكل حالة
  const visitStatusWhere: SQL[] = [eq(visitStatus.status, true)];
  if (projectId) {
    visitStatusWhere.push(eq(visitStatus.sales_project_id, projectId));
  }

  const allVisitStatuss = await db
    .select({
      id: visitStatus.id,
      name: visitStatus.name,
      count: count(visits.id),
    })
    .from(visitStatus)
    .leftJoin(visits, and(...joinConditions))
    .where(and(...visitStatusWhere))
    .groupBy(visitStatus.id, visitStatus.name);

  // 6. إعداد شروط الاستعلام العام للزيارات
  const visitsWhereConditions: SQL[] = [];
  if (projectId) {
    visitsWhereConditions.push(eq(visits.sales_project_id, projectId));
  }
  if (isSales(role)) {
    visitsWhereConditions.push(eq(visits.sales_id, userId));
  } else if (isLeader(role)) {
    if (sales_ids.length > 0) {
      visitsWhereConditions.push(inArray(visits.sales_id, sales_ids));
    } else {
      visitsWhereConditions.push(sql`1 = 0`);
    }
  }
  if (visitDateConditions.length > 0) {
    visitsWhereConditions.push(...visitDateConditions);
  }

  const [countsResult] = await db
    .select({
      negotiation: sql<number>`CAST(COALESCE(COUNT(CASE WHEN ${visits.status} = 'visit' THEN 1 END), 0) AS UNSIGNED)`,
      sales: sql<number>`CAST(COALESCE(COUNT(CASE WHEN ${visits.status} = 'sales' THEN 1 END), 0) AS UNSIGNED)`,
      delivered: sql<number>`CAST(COALESCE(COUNT(CASE WHEN ${visits.status} = 'delivered' THEN 1 END), 0) AS UNSIGNED)`,
      targetAchievedPoints: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${visits.status} != 'visit' THEN ${visits.points} ELSE 0 END), 0) AS UNSIGNED)`,
    })
    .from(visits)
    .where(visitsWhereConditions.length > 0 ? and(...visitsWhereConditions) : undefined);

  const negotiation = Number(countsResult?.negotiation || 0);
  const sales = Number(countsResult?.sales || 0);
  const delivered = Number(countsResult?.delivered || 0);

  const targetAchievedSales = sales + delivered;
  const targetAchievedVisits = negotiation;
  const targetAchievedPoints = Number(countsResult?.targetAchievedPoints || 0);

  // 7. حساب التارجت المخصص بناءً على المستخدم والتواريخ والمشروع
  const targetWhereConditions: SQL[] = [];
  if (projectId) {
    targetWhereConditions.push(eq(targets.sales_project_id, projectId));
  }
  if (isSales(role)) {
    targetWhereConditions.push(eq(target_sales.user_id, userId));
  } else if (isLeader(role)) {
    if (sales_ids.length > 0) {
      targetWhereConditions.push(inArray(target_sales.user_id, sales_ids));
    } else {
      targetWhereConditions.push(sql`1 = 0`);
    }
  }

  if (targetDateConditions.length > 0) {
    targetWhereConditions.push(...(targetDateConditions.filter(Boolean) as SQL[]));
  }

  let total_visits_target = 0;
  let total_sales_target = 0;
  let total_points_target = 0;

  try {
    const [salesTargetResult] = await db
      .select({
        total_visits_target: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${targets.type} = 'visit' THEN ${target_items.number} END), 0) AS UNSIGNED)`,
        total_sales_target: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${targets.type} = 'sales' THEN ${target_items.number} END), 0) AS UNSIGNED)`,
        total_points_target: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${targets.type} = 'points' THEN ${target_items.number} END), 0) AS UNSIGNED)`,
      })
      .from(target_sales)
      .leftJoin(targets, eq(target_sales.target_id, targets.id))
      .leftJoin(target_items, eq(target_items.target_id, targets.id))
      .where(targetWhereConditions.length > 0 ? and(...targetWhereConditions) : undefined);

    total_visits_target = Number(salesTargetResult?.total_visits_target || 0);
    total_sales_target = Number(salesTargetResult?.total_sales_target || 0);
    total_points_target = Number(salesTargetResult?.total_points_target || 0);
  } catch (err) {
    // Fallback if target items calculation has zero records
  }

  // 8. إرسال الاستجابة النظيفة
  SuccessResponse(
    res,
    {
      allVisitStatuss,
      negotiation,
      sales,
      delivered,
      targetAchievedSales,
      targetAchievedVisits,
      targetAchievedPoints,
      total_visits_target,
      total_sales_target,
      total_points_target,
    },
    200
  );
};
