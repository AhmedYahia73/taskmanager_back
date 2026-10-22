"use strict";
// src/controllers/admin/sales/dashboard.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.viewDashboard = exports.dashboardQuerySchema = void 0;
const db_1 = require("../../../models/db");
const schema_1 = require("../../../models/schema");
const BadRequest_1 = require("../../../Errors/BadRequest");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../../utils/response");
const zod_1 = require("zod");
exports.dashboardQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        from: zod_1.z.string().optional(),
        to: zod_1.z.string().optional(),
    }),
});
// ==========================================
// 🎮 Controllers
// ==========================================
const viewDashboard = async (req, res) => {
    const role = req.user?.role;
    const userId = req.user?.id;
    const projectId = (req.salesProjectId || req.headers["x-sales-project-id"] || req.user?.project_id);
    if (!userId) {
        throw new BadRequest_1.BadRequest("User not authenticated.");
    }
    const validated = await exports.dashboardQuerySchema.parseAsync({ query: req.query });
    const { from, to } = validated.query;
    // 1. إعداد شروط التاريخ لجدول الزيارات (visits.createdAt)
    const visitDateConditions = [];
    if (from) {
        visitDateConditions.push((0, drizzle_orm_1.gte)(schema_1.visits.createdAt, new Date(from)));
    }
    if (to) {
        const endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
        visitDateConditions.push((0, drizzle_orm_1.lte)(schema_1.visits.createdAt, endDate));
    }
    // 2. إعداد شروط التاريخ لجدول التارجت (target_items.year & target_items.month)
    const targetDateConditions = [];
    if (from) {
        const fromDate = new Date(from);
        const fromYear = fromDate.getFullYear();
        const fromMonth = fromDate.getMonth() + 1;
        targetDateConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.gt)(schema_1.target_items.year, fromYear), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.target_items.year, fromYear), (0, drizzle_orm_1.gte)(schema_1.target_items.month, fromMonth))));
    }
    if (to) {
        const toDate = new Date(to);
        const toYear = toDate.getFullYear();
        const toMonth = toDate.getMonth() + 1;
        targetDateConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.lt)(schema_1.target_items.year, toYear), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.target_items.year, toYear), (0, drizzle_orm_1.lte)(schema_1.target_items.month, toMonth))));
    }
    // 3. جلب معرفات المبيعات التابعين للقائد
    let sales_ids = [];
    if (role === "leader" || role === "leader_sales") {
        const salesList = await db_1.db
            .select({ id: schema_1.users.id })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.role, "sales"), (0, drizzle_orm_1.eq)(schema_1.users.leader_id, userId)));
        sales_ids = salesList.map((item) => item.id);
    }
    // 4. بناء شروط الـ Join / Filtering
    const joinConditions = [(0, drizzle_orm_1.eq)(schema_1.visits.status_id, schema_1.visitStatus.id)];
    if (projectId) {
        joinConditions.push((0, drizzle_orm_1.eq)(schema_1.visits.sales_project_id, projectId));
    }
    if (role === "sales") {
        joinConditions.push((0, drizzle_orm_1.eq)(schema_1.visits.sales_id, userId));
    }
    else if (role === "leader" || role === "leader_sales") {
        if (sales_ids.length > 0) {
            joinConditions.push((0, drizzle_orm_1.inArray)(schema_1.visits.sales_id, sales_ids));
        }
        else {
            joinConditions.push((0, drizzle_orm_1.sql) `1 = 0`);
        }
    }
    if (visitDateConditions.length > 0) {
        joinConditions.push(...visitDateConditions);
    }
    // 5. جلب الحالات النشطة وعد الزيارات المربوطة بكل حالة
    const visitStatusWhere = [(0, drizzle_orm_1.eq)(schema_1.visitStatus.status, true)];
    if (projectId) {
        visitStatusWhere.push((0, drizzle_orm_1.eq)(schema_1.visitStatus.sales_project_id, projectId));
    }
    const allVisitStatuss = await db_1.db
        .select({
        id: schema_1.visitStatus.id,
        name: schema_1.visitStatus.name,
        count: (0, drizzle_orm_1.count)(schema_1.visits.id),
    })
        .from(schema_1.visitStatus)
        .leftJoin(schema_1.visits, (0, drizzle_orm_1.and)(...joinConditions))
        .where((0, drizzle_orm_1.and)(...visitStatusWhere))
        .groupBy(schema_1.visitStatus.id, schema_1.visitStatus.name);
    // 6. إعداد شروط الاستعلام العام للزيارات
    const visitsWhereConditions = [];
    if (projectId) {
        visitsWhereConditions.push((0, drizzle_orm_1.eq)(schema_1.visits.sales_project_id, projectId));
    }
    if (role === "sales") {
        visitsWhereConditions.push((0, drizzle_orm_1.eq)(schema_1.visits.sales_id, userId));
    }
    else if (role === "leader" || role === "leader_sales") {
        if (sales_ids.length > 0) {
            visitsWhereConditions.push((0, drizzle_orm_1.inArray)(schema_1.visits.sales_id, sales_ids));
        }
        else {
            visitsWhereConditions.push((0, drizzle_orm_1.sql) `1 = 0`);
        }
    }
    if (visitDateConditions.length > 0) {
        visitsWhereConditions.push(...visitDateConditions);
    }
    const [countsResult] = await db_1.db
        .select({
        negotiation: (0, drizzle_orm_1.sql) `CAST(COALESCE(COUNT(CASE WHEN ${schema_1.visits.status} = 'visit' THEN 1 END), 0) AS UNSIGNED)`,
        sales: (0, drizzle_orm_1.sql) `CAST(COALESCE(COUNT(CASE WHEN ${schema_1.visits.status} = 'sales' THEN 1 END), 0) AS UNSIGNED)`,
        delivered: (0, drizzle_orm_1.sql) `CAST(COALESCE(COUNT(CASE WHEN ${schema_1.visits.status} = 'delivered' THEN 1 END), 0) AS UNSIGNED)`,
        targetAchievedPoints: (0, drizzle_orm_1.sql) `CAST(COALESCE(SUM(CASE WHEN ${schema_1.visits.status} != 'visit' THEN ${schema_1.visits.points} ELSE 0 END), 0) AS UNSIGNED)`,
    })
        .from(schema_1.visits)
        .where(visitsWhereConditions.length > 0 ? (0, drizzle_orm_1.and)(...visitsWhereConditions) : undefined);
    const negotiation = Number(countsResult?.negotiation || 0);
    const sales = Number(countsResult?.sales || 0);
    const delivered = Number(countsResult?.delivered || 0);
    const targetAchievedSales = sales + delivered;
    const targetAchievedVisits = negotiation;
    const targetAchievedPoints = Number(countsResult?.targetAchievedPoints || 0);
    // 7. حساب التارجت المخصص بناءً على المستخدم والتواريخ والمشروع
    const targetWhereConditions = [];
    if (projectId) {
        targetWhereConditions.push((0, drizzle_orm_1.eq)(schema_1.targets.sales_project_id, projectId));
    }
    if (role === "sales") {
        targetWhereConditions.push((0, drizzle_orm_1.eq)(schema_1.target_sales.user_id, userId));
    }
    else if (role === "leader" || role === "leader_sales") {
        if (sales_ids.length > 0) {
            targetWhereConditions.push((0, drizzle_orm_1.inArray)(schema_1.target_sales.user_id, sales_ids));
        }
        else {
            targetWhereConditions.push((0, drizzle_orm_1.sql) `1 = 0`);
        }
    }
    if (targetDateConditions.length > 0) {
        targetWhereConditions.push(...targetDateConditions.filter(Boolean));
    }
    let total_visits_target = 0;
    let total_sales_target = 0;
    let total_points_target = 0;
    try {
        const [salesTargetResult] = await db_1.db
            .select({
            total_visits_target: (0, drizzle_orm_1.sql) `CAST(COALESCE(SUM(CASE WHEN ${schema_1.targets.type} = 'visit' THEN ${schema_1.target_items.number} END), 0) AS UNSIGNED)`,
            total_sales_target: (0, drizzle_orm_1.sql) `CAST(COALESCE(SUM(CASE WHEN ${schema_1.targets.type} = 'sales' THEN ${schema_1.target_items.number} END), 0) AS UNSIGNED)`,
            total_points_target: (0, drizzle_orm_1.sql) `CAST(COALESCE(SUM(CASE WHEN ${schema_1.targets.type} = 'points' THEN ${schema_1.target_items.number} END), 0) AS UNSIGNED)`,
        })
            .from(schema_1.target_sales)
            .leftJoin(schema_1.targets, (0, drizzle_orm_1.eq)(schema_1.target_sales.target_id, schema_1.targets.id))
            .leftJoin(schema_1.target_items, (0, drizzle_orm_1.eq)(schema_1.target_items.target_id, schema_1.targets.id))
            .where(targetWhereConditions.length > 0 ? (0, drizzle_orm_1.and)(...targetWhereConditions) : undefined);
        total_visits_target = Number(salesTargetResult?.total_visits_target || 0);
        total_sales_target = Number(salesTargetResult?.total_sales_target || 0);
        total_points_target = Number(salesTargetResult?.total_points_target || 0);
    }
    catch (err) {
        // Fallback if target items calculation has zero records
    }
    // 8. إرسال الاستجابة النظيفة
    (0, response_1.SuccessResponse)(res, {
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
    }, 200);
};
exports.viewDashboard = viewDashboard;
