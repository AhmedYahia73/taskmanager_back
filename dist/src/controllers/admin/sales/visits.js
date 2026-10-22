"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVisits = exports.updateVisits = exports.createVisits = exports.getVisitsById = exports.lists = exports.getVisitsCounts = exports.getAllSales = exports.getAllVisits = exports.getAllVisitsSchema = exports.VisitIdSchema = exports.updateVisitSchema = exports.createVisitSchema = exports.enrichRecordsWithProducts = exports.calculatePointsForProducts = exports.parseProductsArray = void 0;
const helpers_1 = require("./helpers");
const db_1 = require("../../../models/db");
const schema_1 = require("../../../models/schema");
const response_1 = require("../../../utils/response");
const NotFound_1 = require("../../../Errors/NotFound");
const BadRequest_1 = require("../../../Errors/BadRequest");
const zod_1 = require("zod");
const drizzle_orm_1 = require("drizzle-orm");
const parseProductsArray = (raw) => {
    if (!raw)
        return [];
    let parsed = raw;
    if (typeof parsed === "string") {
        try {
            parsed = JSON.parse(parsed);
        }
        catch (e) {
            return [];
        }
    }
    if (!Array.isArray(parsed))
        return [];
    return parsed
        .filter((item) => item && typeof item.product_id === "string" && item.product_id.trim() !== "")
        .map((item) => ({
        product_id: item.product_id,
        duration: item.duration || "",
    }));
};
exports.parseProductsArray = parseProductsArray;
const calculatePointsForProducts = async (items) => {
    const validItems = (0, exports.parseProductsArray)(items);
    if (validItems.length === 0)
        return 0;
    const productIds = Array.from(new Set(validItems.map((i) => i.product_id)));
    const dbProducts = await db_1.db
        .select()
        .from(schema_1.products)
        .where((0, drizzle_orm_1.inArray)(schema_1.products.id, productIds));
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));
    let totalPoints = 0;
    for (const item of validItems) {
        const prod = productMap.get(item.product_id);
        if (prod && prod.points) {
            let pointsData = prod.points;
            if (typeof pointsData === "string") {
                try {
                    pointsData = JSON.parse(pointsData);
                }
                catch (e) {
                    pointsData = [];
                }
            }
            if (Array.isArray(pointsData)) {
                const pointEntry = pointsData.find((p) => p.duration === item.duration);
                if (pointEntry && pointEntry.point !== undefined) {
                    totalPoints += Number(pointEntry.point) || 0;
                }
            }
        }
    }
    return totalPoints;
};
exports.calculatePointsForProducts = calculatePointsForProducts;
const enrichRecordsWithProducts = async (records) => {
    if (records.length === 0)
        return [];
    const allProducts = await db_1.db
        .select({ id: schema_1.products.id, name: schema_1.products.name })
        .from(schema_1.products);
    const productNameMap = new Map(allProducts.map((p) => [p.id, p.name]));
    return records.map((record) => {
        const parsedProducts = (0, exports.parseProductsArray)(record.products).map((item) => ({
            ...item,
            product_name: productNameMap.get(item.product_id) || "",
        }));
        const productSummary = parsedProducts
            .map((p) => (p.product_name ? (p.duration ? `${p.product_name} (${p.duration})` : p.product_name) : ""))
            .filter(Boolean)
            .join(", ");
        return {
            ...record,
            products: parsedProducts,
            product: productSummary || null,
        };
    });
};
exports.enrichRecordsWithProducts = enrichRecordsWithProducts;
// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
const visitProductItemSchema = zod_1.z.object({
    product_id: zod_1.z.string({ required_error: "Product ID is required" }).min(1, "Product ID cannot be empty"),
    duration: zod_1.z.string().optional().default(""),
});
const createVisitSchema = (userRole) => {
    return zod_1.z.object({
        body: zod_1.z.object({
            lat: zod_1.z.number({ required_error: "Latitude (lat) is required" })
                .min(-90, "Latitude must be between -90 and 90")
                .max(90, "Latitude must be between -90 and 90"),
            lng: zod_1.z.number({ required_error: "Longitude (lng) is required" })
                .min(-180, "Longitude must be between -180 and 180")
                .max(180, "Longitude must be between -180 and 180"),
            name: zod_1.z.string({ required_error: "Name is required" })
                .min(1, "Name cannot be empty")
                .max(255, "Name cannot exceed 255 characters"),
            owner_name: zod_1.z.string()
                .max(255, "Owner name cannot exceed 255 characters")
                .nullable()
                .optional(),
            owner_phone: zod_1.z.string()
                .max(20, "Owner phone cannot exceed 20 characters")
                .nullable()
                .optional(),
            address: zod_1.z.string({ required_error: "Address is required" })
                .min(1, "Address cannot be empty")
                .max(500, "Address cannot exceed 500 characters"),
            notes: zod_1.z.string()
                .max(1000, "Notes cannot exceed 1000 characters")
                .nullable()
                .optional(),
            phone: zod_1.z.string({ required_error: "Phone is required" })
                .min(5, "Phone number is too short")
                .max(20, "Phone cannot exceed 20 characters"),
            status: zod_1.z.enum(["visit", "sales", "delivered"], {
                invalid_type_error: "Status must be either 'visit', 'sales', or 'delivered'",
            }).optional(),
            status_id: zod_1.z.string().nullable().optional(),
            sales_id: userRole === "sales" || ((userRole && (0, helpers_1.isLeader)(userRole)) || userRole === "leader_sales")
                ? zod_1.z.string().uuid().optional()
                : zod_1.z.string({ required_error: "Sales ID is required" }),
            products: zod_1.z.array(visitProductItemSchema).nullable().optional(),
            // Backward compatibility if single product_id/duration sent
            product_id: zod_1.z.string().nullable().optional(),
            duration: zod_1.z.string().nullable().optional(),
        }),
    });
};
exports.createVisitSchema = createVisitSchema;
exports.updateVisitSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required in parameters" }),
    }),
    body: zod_1.z.object({
        lat: zod_1.z.number().min(-90).max(90).optional(),
        lng: zod_1.z.number().min(-180).max(180).optional(),
        name: zod_1.z.string().min(1).max(255).optional(),
        owner_name: zod_1.z.string().max(255).nullable().optional(),
        owner_phone: zod_1.z.string().max(20).nullable().optional(),
        address: zod_1.z.string().min(1).max(500).optional(),
        notes: zod_1.z.string().max(1000).nullable().optional(),
        phone: zod_1.z.string().min(5).max(20).optional(),
        status: zod_1.z.enum(["visit", "sales", "delivered"]).optional(),
        status_id: zod_1.z.string().nullable().optional(),
        sales_id: zod_1.z.string().nullable().optional(),
        products: zod_1.z.array(visitProductItemSchema).nullable().optional(),
        product_id: zod_1.z.string().nullable().optional(),
        duration: zod_1.z.string().nullable().optional(),
    }),
});
exports.VisitIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required in parameters" }),
    }),
});
exports.getAllVisitsSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().positive().optional(),
        limit: zod_1.z.coerce.number().int().positive().optional(),
        search: zod_1.z.string().optional(),
        sales_id: zod_1.z.string().optional(),
        status_id: zod_1.z.string().optional(),
        from: zod_1.z.string().optional(),
        to: zod_1.z.string().optional(),
        months: zod_1.z.string().optional(),
        year: zod_1.z.coerce.number().int().optional(),
    }),
});
// ==========================================
// 🎮 Controllers
// ==========================================
// ✅ Get All Visits
const getAllVisits = async (req, res) => {
    await exports.getAllVisitsSchema.parseAsync({ query: req.query });
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const querySalesId = req.query.sales_id;
    const queryStatusId = req.query.status_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const fromDateStr = req.query.from;
    const toDateStr = req.query.to;
    const offset = (page - 1) * limit;
    const projectId = (0, helpers_1.getProjectId)(req);
    let whereConditions = [];
    if (projectId) {
        whereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.visits.sales_project_id, projectId), (0, drizzle_orm_1.sql) `${schema_1.visits.sales_project_id} IS NULL`));
        // Auto-assign any visits with NULL sales_project_id
        db_1.db.update(schema_1.visits).set({ sales_project_id: projectId }).where((0, drizzle_orm_1.sql) `${schema_1.visits.sales_project_id} IS NULL`).catch(() => { });
    }
    whereConditions.push((0, drizzle_orm_1.eq)(schema_1.visits.status, "visit"));
    if (queryStatusId) {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.visits.status_id, queryStatusId));
    }
    if (userRole === "admin" || userRole === "super_admin") {
        if (querySalesId) {
            whereConditions.push((0, drizzle_orm_1.eq)(schema_1.visits.sales_id, querySalesId));
        }
    }
    else if ((0, helpers_1.isLeader)(userRole)) {
        whereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.users.leader_id, userId), (0, drizzle_orm_1.eq)(schema_1.visits.sales_id, userId)));
        if (querySalesId) {
            whereConditions.push((0, drizzle_orm_1.eq)(schema_1.visits.sales_id, querySalesId));
        }
    }
    else if (userRole === "sales") {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.visits.sales_id, userId));
    }
    else {
        throw new BadRequest_1.BadRequest("Unauthorized role");
    }
    if (search) {
        const searchPattern = `%${search}%`;
        whereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.visits.name, searchPattern), (0, drizzle_orm_1.like)(schema_1.visits.owner_name, searchPattern), (0, drizzle_orm_1.like)(schema_1.visits.phone, searchPattern), (0, drizzle_orm_1.like)(schema_1.visits.owner_phone, searchPattern), (0, drizzle_orm_1.like)(schema_1.users.name, searchPattern), (0, drizzle_orm_1.like)(schema_1.users.email, searchPattern), (0, drizzle_orm_1.like)(schema_1.users.phone, searchPattern)));
    }
    if (fromDateStr) {
        const fromDate = new Date(`${fromDateStr}T00:00:00.000Z`);
        if (!isNaN(fromDate.getTime())) {
            whereConditions.push((0, drizzle_orm_1.gte)(schema_1.visits.createdAt, fromDate));
        }
    }
    if (toDateStr) {
        const toDate = new Date(`${toDateStr}T23:59:59.999Z`);
        if (!isNaN(toDate.getTime())) {
            whereConditions.push((0, drizzle_orm_1.lte)(schema_1.visits.createdAt, toDate));
        }
    }
    const monthsParam = req.query.months;
    const yearParam = req.query.year;
    if (monthsParam && yearParam) {
        const months = monthsParam.split(',').map(Number).filter(m => !isNaN(m));
        const year = Number(yearParam);
        if (months.length > 0 && !isNaN(year)) {
            whereConditions.push((0, drizzle_orm_1.inArray)((0, drizzle_orm_1.sql) `MONTH(${schema_1.visits.createdAt})`, months));
            whereConditions.push((0, drizzle_orm_1.eq)((0, drizzle_orm_1.sql) `YEAR(${schema_1.visits.createdAt})`, year));
        }
    }
    let baseQuery = db_1.db
        .select({
        id: schema_1.visits.id,
        lat: schema_1.visits.lat,
        lng: schema_1.visits.lng,
        name: schema_1.visits.name,
        owner_name: schema_1.visits.owner_name,
        owner_phone: schema_1.visits.owner_phone,
        address: schema_1.visits.address,
        notes: schema_1.visits.notes,
        phone: schema_1.visits.phone,
        points: schema_1.visits.points,
        status: schema_1.visits.status,
        visit_status: schema_1.visitStatus.name,
        status_id: schema_1.visits.status_id,
        sales_id: schema_1.users.id,
        sales: schema_1.users.name,
        sales_phone: schema_1.users.phone,
        products: schema_1.visits.products,
        createdAt: (0, drizzle_orm_1.sql) `DATE_FORMAT(${schema_1.visits.createdAt}, '%Y-%m-%d')`,
    })
        .from(schema_1.visits)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.visits.sales_id, schema_1.users.id))
        .leftJoin(schema_1.visitStatus, (0, drizzle_orm_1.eq)(schema_1.visits.status_id, schema_1.visitStatus.id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.visits.createdAt))
        .$dynamic();
    let countQuery = db_1.db
        .select({ total: (0, drizzle_orm_1.count)() })
        .from(schema_1.visits)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.visits.sales_id, schema_1.users.id))
        .leftJoin(schema_1.visitStatus, (0, drizzle_orm_1.eq)(schema_1.visits.status_id, schema_1.visitStatus.id))
        .$dynamic();
    if (whereConditions.length > 0) {
        baseQuery = baseQuery.where((0, drizzle_orm_1.and)(...whereConditions));
        countQuery = countQuery.where((0, drizzle_orm_1.and)(...whereConditions));
    }
    const [allVisitsRaw, [{ total: totalCount }]] = await Promise.all([
        baseQuery.limit(limit).offset(offset),
        countQuery
    ]);
    const enrichedVisits = await (0, exports.enrichRecordsWithProducts)(allVisitsRaw);
    const allVisits = enrichedVisits.map((visit) => ({
        ...visit,
        map_link: `https://www.google.com/maps/search/?api=1&query=${visit.lat},${visit.lng}`
    }));
    (0, response_1.SuccessResponse)(res, {
        allVisits,
        pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit)
        }
    }, 200);
};
exports.getAllVisits = getAllVisits;
// ✅ Get All Sales (Visits with status != 'visit')
const getAllSales = async (req, res) => {
    await exports.getAllVisitsSchema.parseAsync({ query: req.query });
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const querySalesId = req.query.sales_id;
    const queryStatusId = req.query.status_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const fromDateStr = req.query.from;
    const toDateStr = req.query.to;
    const offset = (page - 1) * limit;
    const projectId = (0, helpers_1.getProjectId)(req);
    let whereConditions = [];
    if (projectId) {
        whereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.visits.sales_project_id, projectId), (0, drizzle_orm_1.sql) `${schema_1.visits.sales_project_id} IS NULL`));
    }
    whereConditions.push((0, drizzle_orm_1.ne)(schema_1.visits.status, "visit"));
    if (queryStatusId) {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.visits.status_id, queryStatusId));
    }
    if (userRole === "admin" || userRole === "super_admin") {
        if (querySalesId) {
            whereConditions.push((0, drizzle_orm_1.eq)(schema_1.visits.sales_id, querySalesId));
        }
    }
    else if ((0, helpers_1.isLeader)(userRole)) {
        whereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.users.leader_id, userId), (0, drizzle_orm_1.eq)(schema_1.visits.sales_id, userId)));
        if (querySalesId) {
            whereConditions.push((0, drizzle_orm_1.eq)(schema_1.visits.sales_id, querySalesId));
        }
    }
    else if (userRole === "sales") {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.visits.sales_id, userId));
    }
    else {
        throw new BadRequest_1.BadRequest("Unauthorized role");
    }
    if (search) {
        const searchPattern = `%${search}%`;
        whereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.visits.name, searchPattern), (0, drizzle_orm_1.like)(schema_1.visits.owner_name, searchPattern), (0, drizzle_orm_1.like)(schema_1.visits.phone, searchPattern), (0, drizzle_orm_1.like)(schema_1.visits.owner_phone, searchPattern), (0, drizzle_orm_1.like)(schema_1.users.name, searchPattern), (0, drizzle_orm_1.like)(schema_1.users.email, searchPattern), (0, drizzle_orm_1.like)(schema_1.users.phone, searchPattern)));
    }
    if (fromDateStr) {
        const fromDate = new Date(`${fromDateStr}T00:00:00.000Z`);
        if (!isNaN(fromDate.getTime())) {
            whereConditions.push((0, drizzle_orm_1.gte)(schema_1.visits.createdAt, fromDate));
        }
    }
    if (toDateStr) {
        const toDate = new Date(`${toDateStr}T23:59:59.999Z`);
        if (!isNaN(toDate.getTime())) {
            whereConditions.push((0, drizzle_orm_1.lte)(schema_1.visits.createdAt, toDate));
        }
    }
    const monthsParam = req.query.months;
    const yearParam = req.query.year;
    if (monthsParam && yearParam) {
        const months = monthsParam.split(',').map(Number).filter(m => !isNaN(m));
        const year = Number(yearParam);
        if (months.length > 0 && !isNaN(year)) {
            whereConditions.push((0, drizzle_orm_1.inArray)((0, drizzle_orm_1.sql) `MONTH(${schema_1.visits.createdAt})`, months));
            whereConditions.push((0, drizzle_orm_1.eq)((0, drizzle_orm_1.sql) `YEAR(${schema_1.visits.createdAt})`, year));
        }
    }
    let baseQuery = db_1.db
        .select({
        id: schema_1.visits.id,
        lat: schema_1.visits.lat,
        lng: schema_1.visits.lng,
        name: schema_1.visits.name,
        owner_name: schema_1.visits.owner_name,
        owner_phone: schema_1.visits.owner_phone,
        address: schema_1.visits.address,
        notes: schema_1.visits.notes,
        phone: schema_1.visits.phone,
        points: schema_1.visits.points,
        status: schema_1.visits.status,
        visit_status: schema_1.visitStatus.name,
        status_id: schema_1.visits.status_id,
        sales_id: schema_1.users.id,
        sales: schema_1.users.name,
        sales_phone: schema_1.users.phone,
        products: schema_1.visits.products,
        createdAt: schema_1.visits.createdAt
    })
        .from(schema_1.visits)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.visits.sales_id, schema_1.users.id))
        .leftJoin(schema_1.visitStatus, (0, drizzle_orm_1.eq)(schema_1.visits.status_id, schema_1.visitStatus.id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.visits.createdAt))
        .$dynamic();
    let countQuery = db_1.db
        .select({ total: (0, drizzle_orm_1.count)() })
        .from(schema_1.visits)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.visits.sales_id, schema_1.users.id))
        .leftJoin(schema_1.visitStatus, (0, drizzle_orm_1.eq)(schema_1.visits.status_id, schema_1.visitStatus.id))
        .$dynamic();
    if (whereConditions.length > 0) {
        baseQuery = baseQuery.where((0, drizzle_orm_1.and)(...whereConditions));
        countQuery = countQuery.where((0, drizzle_orm_1.and)(...whereConditions));
    }
    const [allVisitsRaw, [{ total: totalCount }]] = await Promise.all([
        baseQuery.limit(limit).offset(offset),
        countQuery
    ]);
    const enrichedVisits = await (0, exports.enrichRecordsWithProducts)(allVisitsRaw);
    const allVisits = enrichedVisits.map((visit) => ({
        ...visit,
        map_link: `https://www.google.com/maps/search/?api=1&query=${visit.lat},${visit.lng}`
    }));
    (0, response_1.SuccessResponse)(res, {
        allVisits,
        pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit)
        }
    }, 200);
};
exports.getAllSales = getAllSales;
const getVisitsCounts = async (req, res) => {
    await exports.getAllVisitsSchema.parseAsync({ query: req.query });
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const querySalesId = req.query.sales_id;
    const queryStatusId = req.query.status_id;
    const search = req.query.search || '';
    const fromDateStr = req.query.from;
    const toDateStr = req.query.to;
    const projectId = (0, helpers_1.getProjectId)(req);
    let whereConditions = [];
    let leadsWhereConditions = [];
    if (projectId) {
        whereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.visits.sales_project_id, projectId), (0, drizzle_orm_1.sql) `${schema_1.visits.sales_project_id} IS NULL`));
        leadsWhereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.leads.sales_project_id, projectId), (0, drizzle_orm_1.sql) `${schema_1.leads.sales_project_id} IS NULL`));
    }
    if (queryStatusId) {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.visits.status_id, queryStatusId));
    }
    if (userRole === "admin" || userRole === "super_admin") {
        if (querySalesId) {
            whereConditions.push((0, drizzle_orm_1.eq)(schema_1.visits.sales_id, querySalesId));
            leadsWhereConditions.push((0, drizzle_orm_1.eq)(schema_1.leads.sales_id, querySalesId));
        }
    }
    else if ((0, helpers_1.isLeader)(userRole)) {
        whereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.users.leader_id, userId), (0, drizzle_orm_1.eq)(schema_1.visits.sales_id, userId)));
        leadsWhereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.users.leader_id, userId), (0, drizzle_orm_1.eq)(schema_1.leads.sales_id, userId)));
        if (querySalesId) {
            whereConditions.push((0, drizzle_orm_1.eq)(schema_1.visits.sales_id, querySalesId));
            leadsWhereConditions.push((0, drizzle_orm_1.eq)(schema_1.leads.sales_id, querySalesId));
        }
    }
    else if (userRole === "sales") {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.visits.sales_id, userId));
        leadsWhereConditions.push((0, drizzle_orm_1.eq)(schema_1.leads.sales_id, userId));
    }
    else {
        throw new BadRequest_1.BadRequest("Unauthorized role");
    }
    if (search) {
        const searchPattern = `%${search}%`;
        whereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.visits.name, searchPattern), (0, drizzle_orm_1.like)(schema_1.visits.phone, searchPattern), (0, drizzle_orm_1.like)(schema_1.users.name, searchPattern), (0, drizzle_orm_1.like)(schema_1.users.email, searchPattern), (0, drizzle_orm_1.like)(schema_1.users.phone, searchPattern)));
    }
    if (fromDateStr) {
        const fromDate = new Date(`${fromDateStr}T00:00:00.000Z`);
        if (!isNaN(fromDate.getTime())) {
            whereConditions.push((0, drizzle_orm_1.gte)(schema_1.visits.createdAt, fromDate));
        }
    }
    if (toDateStr) {
        const toDate = new Date(`${toDateStr}T23:59:59.999Z`);
        if (!isNaN(toDate.getTime())) {
            whereConditions.push((0, drizzle_orm_1.lte)(schema_1.visits.createdAt, toDate));
        }
    }
    const [countsResult] = await db_1.db
        .select({
        visitCount: (0, drizzle_orm_1.sql) `COALESCE(COUNT(CASE WHEN ${schema_1.visits.status} = 'visit' THEN 1 END), 0)`,
        notVisitCount: (0, drizzle_orm_1.sql) `COALESCE(COUNT(CASE WHEN ${schema_1.visits.status} != 'visit' THEN 1 END), 0)`,
    })
        .from(schema_1.visits)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.visits.sales_id, schema_1.users.id))
        .leftJoin(schema_1.visitStatus, (0, drizzle_orm_1.eq)(schema_1.visits.status_id, schema_1.visitStatus.id))
        .where(whereConditions.length > 0 ? (0, drizzle_orm_1.and)(...whereConditions) : undefined);
    const visitCount = Number(countsResult?.visitCount || 0);
    const notVisitCount = Number(countsResult?.notVisitCount || 0);
    let wishListWhereConditions = [];
    if (projectId) {
        wishListWhereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.wishList.sales_project_id, projectId), (0, drizzle_orm_1.sql) `${schema_1.wishList.sales_project_id} IS NULL`));
    }
    if ((0, helpers_1.isLeader)(userRole)) {
        wishListWhereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.users.leader_id, userId), (0, drizzle_orm_1.eq)(schema_1.wishList.sales_id, userId)));
        if (querySalesId) {
            wishListWhereConditions.push((0, drizzle_orm_1.eq)(schema_1.wishList.sales_id, querySalesId));
        }
    }
    else if (userRole === "sales") {
        wishListWhereConditions.push((0, drizzle_orm_1.eq)(schema_1.wishList.sales_id, userId));
    }
    else if (userRole === "admin" || userRole === "super_admin") {
        if (querySalesId) {
            wishListWhereConditions.push((0, drizzle_orm_1.eq)(schema_1.wishList.sales_id, querySalesId));
        }
    }
    const [{ totalWishlist }] = await db_1.db
        .select({ totalWishlist: (0, drizzle_orm_1.count)() })
        .from(schema_1.wishList)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.wishList.sales_id, schema_1.users.id))
        .where(wishListWhereConditions.length > 0 ? (0, drizzle_orm_1.and)(...wishListWhereConditions) : undefined);
    const wishListsCount = Number(totalWishlist || 0);
    const [{ totalLeads }] = await db_1.db
        .select({ totalLeads: (0, drizzle_orm_1.count)() })
        .from(schema_1.leads)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.leads.sales_id, schema_1.users.id))
        .where(leadsWhereConditions.length > 0 ? (0, drizzle_orm_1.and)(...leadsWhereConditions) : undefined);
    (0, response_1.SuccessResponse)(res, {
        visitCount,
        salesCount: notVisitCount,
        total: visitCount + notVisitCount,
        wishListsCount,
        leadsCount: Number(totalLeads || 0),
    }, 200);
};
exports.getVisitsCounts = getVisitsCounts;
// ✅ Get Active Visit Statuses & Sales List
const lists = async (req, res) => {
    const rawStatuses = await db_1.db
        .select({
        id: schema_1.visitStatus.id,
        name: schema_1.visitStatus.name,
    })
        .from(schema_1.visitStatus)
        .where((0, drizzle_orm_1.eq)(schema_1.visitStatus.status, true));
    // Auto-heal: Fix any legacy records that have empty string id
    const visit_status = [];
    for (const st of rawStatuses) {
        if (!st.id || st.id.trim() === "") {
            const generatedId = crypto.randomUUID();
            await db_1.db.update(schema_1.visitStatus).set({ id: generatedId }).where((0, drizzle_orm_1.eq)(schema_1.visitStatus.name, st.name)).catch(() => { });
            visit_status.push({ ...st, id: generatedId });
        }
        else {
            visit_status.push(st);
        }
    }
    const userId = req.user?.id;
    let sales = [];
    if ((req.user && (0, helpers_1.isLeader)(req.user.role)) && userId) {
        sales = await db_1.db
            .select({
            id: schema_1.users.id,
            name: schema_1.users.name,
            phone: schema_1.users.phone,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.leader_id, userId), (0, drizzle_orm_1.eq)(schema_1.users.role, "sales")), (0, drizzle_orm_1.eq)(schema_1.users.id, userId)));
    }
    else {
        sales = await db_1.db
            .select({
            id: schema_1.users.id,
            name: schema_1.users.name,
            phone: schema_1.users.phone,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.role, "sales"));
    }
    (0, response_1.SuccessResponse)(res, { visit_status, sales }, 200);
};
exports.lists = lists;
// ✅ Get Visits By ID
const getVisitsById = async (req, res) => {
    const validated = await exports.VisitIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const visitRaw = await db_1.db
        .select({
        id: schema_1.visits.id,
        lat: schema_1.visits.lat,
        lng: schema_1.visits.lng,
        name: schema_1.visits.name,
        owner_name: schema_1.visits.owner_name,
        owner_phone: schema_1.visits.owner_phone,
        address: schema_1.visits.address,
        notes: schema_1.visits.notes,
        phone: schema_1.visits.phone,
        points: schema_1.visits.points,
        status: schema_1.visits.status,
        status_id: schema_1.visits.status_id,
        sales_id: schema_1.visits.sales_id,
        products: schema_1.visits.products,
    })
        .from(schema_1.visits)
        .where((0, helpers_1.getProjectId)(req) ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.visits.id, id), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.visits.sales_project_id, (0, helpers_1.getProjectId)(req)), (0, drizzle_orm_1.sql) `${schema_1.visits.sales_project_id} IS NULL`)) : (0, drizzle_orm_1.eq)(schema_1.visits.id, id))
        .limit(1);
    if (!visitRaw[0]) {
        throw new NotFound_1.NotFound("Visit not found");
    }
    if (req.user?.role === "sales" && visitRaw[0].sales_id !== req.user.id) {
        throw new BadRequest_1.BadRequest("You do not have permission to access this visit.");
    }
    const [enriched] = await (0, exports.enrichRecordsWithProducts)([visitRaw[0]]);
    const visit = {
        ...enriched,
        map_link: `https://www.google.com/maps/search/?api=1&query=${visitRaw[0].lat},${visitRaw[0].lng}`
    };
    (0, response_1.SuccessResponse)(res, { Visit: visit }, 200);
};
exports.getVisitsById = getVisitsById;
// ✅ Create Visits
const createVisits = async (req, res) => {
    const validated = await (0, exports.createVisitSchema)(req.user?.role).parseAsync({ body: req.body });
    const { lat, lng, name, address, notes, phone, status_id, owner_name, owner_phone } = validated.body;
    let status = "visit";
    if (((req.user && (0, helpers_1.isLeader)(req.user.role)) || req.user?.role === "admin") && req.body.status) {
        status = req.body.status;
    }
    let sales_id;
    if (req.user?.role === "sales") {
        sales_id = req.user.id;
    }
    else if ((req.user && (0, helpers_1.isLeader)(req.user.role))) {
        sales_id = validated.body.sales_id || req.user.id;
    }
    else {
        sales_id = validated.body.sales_id;
    }
    if (!sales_id) {
        throw new BadRequest_1.BadRequest("sales_id is required.");
    }
    const salesExist = await db_1.db
        .select({ id: schema_1.users.id })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, sales_id), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.users.role, "sales"), (0, drizzle_orm_1.eq)(schema_1.users.role, "leader_sales"))))
        .limit(1);
    if (!salesExist[0]) {
        throw new BadRequest_1.BadRequest("The assigned sales_id does not exist or user is not a sales member/leader.");
    }
    if (status_id) {
        const statusExist = await db_1.db
            .select({ id: schema_1.visitStatus.id })
            .from(schema_1.visitStatus)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.visitStatus.id, status_id), (0, drizzle_orm_1.eq)(schema_1.visitStatus.status, true)))
            .limit(1);
        if (!statusExist[0]) {
            throw new BadRequest_1.BadRequest("The assigned status_id does not exist or is inactive.");
        }
    }
    let visitProducts = [];
    if (validated.body.products && Array.isArray(validated.body.products)) {
        visitProducts = (0, exports.parseProductsArray)(validated.body.products);
    }
    else if (validated.body.product_id) {
        visitProducts = [{
                product_id: validated.body.product_id,
                duration: validated.body.duration || "",
            }];
    }
    const insertData = {
        id: crypto.randomUUID(),
        lat,
        lng,
        name,
        owner_name: owner_name || null,
        owner_phone: owner_phone || null,
        address,
        notes: notes || null,
        phone,
        status: status,
        status_id: status_id || null,
        sales_id,
        products: visitProducts,
        points: 0,
        sales_project_id: (req.salesProjectId || req.headers["x-sales-project-id"] || (0, helpers_1.getProjectId)(req)),
    };
    if ((status === "sales" || status === "delivered") && visitProducts.length > 0 && ((req.user && (0, helpers_1.isLeader)(req.user.role)) || req.user?.role === "admin")) {
        insertData.points = await (0, exports.calculatePointsForProducts)(visitProducts);
    }
    await db_1.db.insert(schema_1.visits).values(insertData);
    (0, response_1.SuccessResponse)(res, { message: "Visit created successfully" }, 201);
};
exports.createVisits = createVisits;
// ✅ Update Visits
const updateVisits = async (req, res) => {
    const validated = await exports.updateVisitSchema.parseAsync({
        params: req.params,
        body: req.body
    });
    const { id } = validated.params;
    const { lat, lng, name, address, notes, phone, status, status_id, owner_name, owner_phone } = validated.body;
    const existingVisit = await db_1.db
        .select()
        .from(schema_1.visits)
        .where((0, helpers_1.getProjectId)(req) ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.visits.id, id), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.visits.sales_project_id, (0, helpers_1.getProjectId)(req)), (0, drizzle_orm_1.sql) `${schema_1.visits.sales_project_id} IS NULL`)) : (0, drizzle_orm_1.eq)(schema_1.visits.id, id))
        .limit(1);
    const currentVisit = existingVisit[0];
    if (!currentVisit) {
        throw new NotFound_1.NotFound("Visit not found");
    }
    if (req.user?.role === "sales" && currentVisit.sales_id !== req.user.id) {
        throw new BadRequest_1.BadRequest("You do not have permission to modify this visit.");
    }
    let sales_id = req.body.sales_id;
    if (sales_id !== undefined && sales_id !== null) {
        const salesExist = await db_1.db
            .select({ id: schema_1.users.id })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, sales_id), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.users.role, "sales"), (0, drizzle_orm_1.eq)(schema_1.users.role, "leader_sales"))))
            .limit(1);
        if (!salesExist[0]) {
            throw new BadRequest_1.BadRequest("The updated sales_id does not exist.");
        }
    }
    if (status_id !== undefined && status_id !== null) {
        const statusExist = await db_1.db
            .select({ id: schema_1.visitStatus.id })
            .from(schema_1.visitStatus)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.visitStatus.id, status_id), (0, drizzle_orm_1.eq)(schema_1.visitStatus.status, true)))
            .limit(1);
        if (!statusExist[0]) {
            throw new BadRequest_1.BadRequest("The updated status_id does not exist.");
        }
    }
    const updateData = {};
    if (lat !== undefined)
        updateData.lat = lat;
    if (lng !== undefined)
        updateData.lng = lng;
    if (name !== undefined)
        updateData.name = name;
    if (owner_name !== undefined)
        updateData.owner_name = owner_name || null;
    if (owner_phone !== undefined)
        updateData.owner_phone = owner_phone || null;
    if (address !== undefined)
        updateData.address = address;
    if (notes !== undefined)
        updateData.notes = notes;
    if (phone !== undefined)
        updateData.phone = phone;
    if (status_id !== undefined)
        updateData.status_id = status_id;
    if (sales_id !== undefined && req.user?.role !== "sales")
        updateData.sales_id = sales_id;
    if (validated.body.products !== undefined) {
        updateData.products = (0, exports.parseProductsArray)(validated.body.products);
    }
    else if (validated.body.product_id !== undefined && validated.body.product_id) {
        updateData.products = [{
                product_id: validated.body.product_id,
                duration: validated.body.duration || "",
            }];
    }
    const effectiveProducts = updateData.products !== undefined
        ? updateData.products
        : (0, exports.parseProductsArray)(currentVisit.products);
    if (status !== undefined) {
        if (req.user?.role === "sales") {
            if (!req.user.id) {
                throw new BadRequest_1.BadRequest("User ID is missing.");
            }
            const request_item = await db_1.db
                .select({ id: schema_1.statusRequest.id })
                .from(schema_1.statusRequest)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.statusRequest.visitId, currentVisit.id), (0, drizzle_orm_1.eq)(schema_1.statusRequest.from, currentVisit.status), (0, drizzle_orm_1.eq)(schema_1.statusRequest.to, status), (0, drizzle_orm_1.eq)(schema_1.statusRequest.userId, req.user.id), (0, drizzle_orm_1.eq)(schema_1.statusRequest.status, "pending")))
                .limit(1);
            if (!request_item[0]) {
                await db_1.db.insert(schema_1.statusRequest).values({
                    id: crypto.randomUUID(),
                    visitId: currentVisit.id,
                    from: currentVisit.status,
                    to: status,
                    userId: req.user.id,
                    status: "pending",
                    sales_project_id: (0, helpers_1.getProjectId)(req),
                });
            }
        }
        else {
            updateData.status = status;
            if (status === "sales" || status === "delivered") {
                updateData.points = await (0, exports.calculatePointsForProducts)(effectiveProducts);
            }
            else {
                updateData.points = 0;
            }
        }
    }
    else if (updateData.products !== undefined && req.user?.role !== "sales") {
        if (currentVisit.status === "sales" || currentVisit.status === "delivered") {
            updateData.points = await (0, exports.calculatePointsForProducts)(effectiveProducts);
        }
    }
    let updateConditions = (0, drizzle_orm_1.eq)(schema_1.visits.id, id);
    if (req.user?.role === "sales") {
        updateConditions = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.visits.id, id), (0, drizzle_orm_1.eq)(schema_1.visits.sales_id, req.user.id));
    }
    if (Object.keys(updateData).length > 0) {
        await db_1.db.update(schema_1.visits).set(updateData).where(updateConditions);
    }
    (0, response_1.SuccessResponse)(res, { message: "Visit updated successfully" }, 200);
};
exports.updateVisits = updateVisits;
// ✅ Delete Visits
const deleteVisits = async (req, res) => {
    const validated = await exports.VisitIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const existingVisit = await db_1.db
        .select()
        .from(schema_1.visits)
        .where((0, helpers_1.getProjectId)(req) ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.visits.id, id), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.visits.sales_project_id, (0, helpers_1.getProjectId)(req)), (0, drizzle_orm_1.sql) `${schema_1.visits.sales_project_id} IS NULL`)) : (0, drizzle_orm_1.eq)(schema_1.visits.id, id))
        .limit(1);
    if (!existingVisit[0]) {
        throw new NotFound_1.NotFound("Visit not found");
    }
    let deleteConditions = (0, drizzle_orm_1.eq)(schema_1.visits.id, id);
    if ((req.user && (0, helpers_1.isLeader)(req.user.role)) || req.user?.role === "sales") {
        deleteConditions = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.visits.id, id), (0, drizzle_orm_1.eq)(schema_1.visits.sales_id, req.user.id));
    }
    await db_1.db.delete(schema_1.visits).where(deleteConditions);
    (0, response_1.SuccessResponse)(res, { message: "Visit deleted successfully" }, 200);
};
exports.deleteVisits = deleteVisits;
