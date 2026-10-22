import { getProjectId, isLeader, isAdminRole } from "./helpers";
import { Request, Response } from "express";
import { db } from "../../../models/db";
import { users, visits, visitStatus, statusRequest, wishList, products, leads } from "../../../models/schema"; 
import { SuccessResponse } from "../../../utils/response";
import { NotFound } from "../../../Errors/NotFound";
import { BadRequest } from "../../../Errors/BadRequest";
import { z } from "zod";
import { SQL, and, or, eq, like, inArray, count, gte, lte, desc, ne, sql } from 'drizzle-orm';

// ==========================================
// 🛠️ Helpers for Multi-Products & Points
// ==========================================

export type VisitProductItem = {
    product_id: string;
    duration: string;
};

export const parseProductsArray = (raw: any): VisitProductItem[] => {
    if (!raw) return [];
    let parsed = raw;
    if (typeof parsed === "string") {
        try {
            parsed = JSON.parse(parsed);
        } catch (e) {
            return [];
        }
    }
    if (!Array.isArray(parsed)) return [];
    return parsed
        .filter((item: any) => item && typeof item.product_id === "string" && item.product_id.trim() !== "")
        .map((item: any) => ({
            product_id: item.product_id,
            duration: item.duration || "",
        }));
};

export const calculatePointsForProducts = async (items: VisitProductItem[]): Promise<number> => {
    const validItems = parseProductsArray(items);
    if (validItems.length === 0) return 0;

    const productIds = Array.from(new Set(validItems.map((i) => i.product_id)));
    const dbProducts = await db
        .select()
        .from(products)
        .where(inArray(products.id, productIds));

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));
    let totalPoints = 0;

    for (const item of validItems) {
        const prod = productMap.get(item.product_id);
        if (prod && prod.points) {
            let pointsData: any = prod.points;
            if (typeof pointsData === "string") {
                try {
                    pointsData = JSON.parse(pointsData);
                } catch (e) {
                    pointsData = [];
                }
            }
            if (Array.isArray(pointsData)) {
                const pointEntry = pointsData.find((p: any) => p.duration === item.duration);
                if (pointEntry && pointEntry.point !== undefined) {
                    totalPoints += Number(pointEntry.point) || 0;
                }
            }
        }
    }

    return totalPoints;
};

export const enrichRecordsWithProducts = async <T extends { products?: any }>(records: T[]) => {
    if (records.length === 0) return [];

    const allProducts = await db
        .select({ id: products.id, name: products.name })
        .from(products);
    const productNameMap = new Map(allProducts.map((p) => [p.id, p.name]));

    return records.map((record) => {
        const parsedProducts = parseProductsArray(record.products).map((item) => ({
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

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================

const visitProductItemSchema = z.object({
    product_id: z.string({ required_error: "Product ID is required" }).min(1, "Product ID cannot be empty"),
    duration: z.string().optional().default(""),
});

export const createVisitSchema = (userRole?: string) => {
    return z.object({
        body: z.object({ 
            lat: z.number({ required_error: "Latitude (lat) is required" })
                .min(-90, "Latitude must be between -90 and 90")
                .max(90, "Latitude must be between -90 and 90"),
            
            lng: z.number({ required_error: "Longitude (lng) is required" })
                .min(-180, "Longitude must be between -180 and 180")
                .max(180, "Longitude must be between -180 and 180"),
            
            name: z.string({ required_error: "Name is required" })
                .min(1, "Name cannot be empty")
                .max(255, "Name cannot exceed 255 characters"),
            
            owner_name: z.string()
                .max(255, "Owner name cannot exceed 255 characters")
                .nullable()
                .optional(),
            
            owner_phone: z.string()
                .max(20, "Owner phone cannot exceed 20 characters")
                .nullable()
                .optional(),
            
            address: z.string({ required_error: "Address is required" })
                .min(1, "Address cannot be empty")
                .max(500, "Address cannot exceed 500 characters"),
            
            notes: z.string()
                .max(1000, "Notes cannot exceed 1000 characters")
                .nullable()
                .optional(),
            
            phone: z.string({ required_error: "Phone is required" })
                .min(5, "Phone number is too short")
                .max(20, "Phone cannot exceed 20 characters"),
            
            status: z.enum(["visit", "sales", "delivered"], {
                invalid_type_error: "Status must be either 'visit', 'sales', or 'delivered'",
            }).optional(),

            status_id: z.string().nullable().optional(),
            sales_id: userRole === "sales" || ((userRole && isLeader(userRole)) || userRole === "leader_sales")
                ? z.string().uuid().optional()
                : z.string({ required_error: "Sales ID is required" }),
            products: z.array(visitProductItemSchema).nullable().optional(),
            // Backward compatibility if single product_id/duration sent
            product_id: z.string().nullable().optional(),
            duration: z.string().nullable().optional(),
        }),
    }); 
};

export const updateVisitSchema = z.object({
    params: z.object({
        id: z.string({ required_error: "ID is required in parameters" }),
    }),
    body: z.object({ 
        lat: z.number().min(-90).max(90).optional(),
        lng: z.number().min(-180).max(180).optional(),
        name: z.string().min(1).max(255).optional(),
        owner_name: z.string().max(255).nullable().optional(),
        owner_phone: z.string().max(20).nullable().optional(),
        address: z.string().min(1).max(500).optional(),
        notes: z.string().max(1000).nullable().optional(),
        phone: z.string().min(5).max(20).optional(),
        status: z.enum(["visit", "sales", "delivered"]).optional(),
        status_id: z.string().nullable().optional(),
        sales_id: z.string().nullable().optional(),
        products: z.array(visitProductItemSchema).nullable().optional(),
        product_id: z.string().nullable().optional(),
        duration: z.string().nullable().optional(),
    }),
});

export const VisitIdSchema = z.object({
    params: z.object({
        id: z.string({ required_error: "ID is required in parameters" }),
    }),
}); 

export const getAllVisitsSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().optional(),
        search: z.string().optional(),
        sales_id: z.string().optional(),
        status_id: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        months: z.string().optional(),
        year: z.coerce.number().int().optional(),
    }),
});


// ==========================================
// 🎮 Controllers
// ==========================================

// ✅ Get All Visits
export const getAllVisits = async (req: Request, res: Response) => {  
    await getAllVisitsSchema.parseAsync({ query: req.query });
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const querySalesId = req.query.sales_id as string;
    const queryStatusId = req.query.status_id as string;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    
    const fromDateStr = req.query.from as string;
    const toDateStr = req.query.to as string;

    const offset = (page - 1) * limit;

    const projectId = getProjectId(req);
    let whereConditions: SQL[] = [];
    if (projectId) {
        whereConditions.push(eq(visits.sales_project_id, projectId));
    }

    whereConditions.push(eq(visits.status, "visit"));
    
    if (queryStatusId) {
        whereConditions.push(eq(visits.status_id, queryStatusId));
    }

    if (userRole === "admin") {
        if (querySalesId) {
            whereConditions.push(eq(visits.sales_id, querySalesId));
        }
    } else if (((userRole && isLeader(userRole)) || userRole === "leader_sales")) {
        const teamSales = await db
            .select({ id: users.id })
            .from(users)
            .where(
                or(
                    and(eq(users.leader_id, userId!), eq(users.role, "sales")), 
                    eq(users.id, userId!)
                )
            );
        
        const salesIds = teamSales.map(s => s.id);

        if (querySalesId) {
            if (salesIds.includes(querySalesId)) {
                whereConditions.push(eq(visits.sales_id, querySalesId));
            } else {
                throw new BadRequest("You do not have access to this sales member's visits.");
            }
        } else {
            if (salesIds.length > 0) {
                whereConditions.push(inArray(visits.sales_id, salesIds));
            } else {
                return SuccessResponse(res, { allVisits: [], pagination: { total: 0, page, limit, totalPages: 0 } }, 200);
            }
        }
    } else if (userRole === "sales") {
        whereConditions.push(eq(visits.sales_id, userId!));
    } else {
        throw new BadRequest("Unauthorized role");
    }

    if (search) {
        const searchPattern = `%${search}%`;
        whereConditions.push(
            or(
                like(visits.name, searchPattern),
                like(visits.owner_name, searchPattern),
                like(visits.phone, searchPattern),
                like(visits.owner_phone, searchPattern),
                like(users.name, searchPattern),
                like(users.email, searchPattern),
                like(users.phone, searchPattern)
            ) as SQL
        );
    }

    if (fromDateStr) {
        const fromDate = new Date(`${fromDateStr}T00:00:00.000Z`);
        if (!isNaN(fromDate.getTime())) {
            whereConditions.push(gte(visits.createdAt, fromDate));
        }
    }

    if (toDateStr) {
        const toDate = new Date(`${toDateStr}T23:59:59.999Z`);
        if (!isNaN(toDate.getTime())) {
            whereConditions.push(lte(visits.createdAt, toDate));
        }
    }

    const monthsParam = req.query.months as string;
    const yearParam = req.query.year as string;
    if (monthsParam && yearParam) {
        const months = monthsParam.split(',').map(Number).filter(m => !isNaN(m));
        const year = Number(yearParam);
        if (months.length > 0 && !isNaN(year)) {
            whereConditions.push(inArray(sql`MONTH(${visits.createdAt})`, months));
            whereConditions.push(eq(sql`YEAR(${visits.createdAt})`, year));
        }
    }
 
    let baseQuery = db
        .select({
            id: visits.id, 
            lat: visits.lat,
            lng: visits.lng,
            name: visits.name,
            owner_name: visits.owner_name,
            owner_phone: visits.owner_phone,
            address: visits.address,
            notes: visits.notes,
            phone: visits.phone,
            points: visits.points,
            status: visits.status,
            visit_status: visitStatus.name,
            status_id: visits.status_id,
            sales_id: users.id,
            sales: users.name,
            sales_phone: users.phone,
            products: visits.products,
            createdAt: sql<string>`DATE_FORMAT(${visits.createdAt}, '%Y-%m-%d')`,
        })
        .from(visits)
        .leftJoin(users, eq(visits.sales_id, users.id))
        .leftJoin(visitStatus, eq(visits.status_id, visitStatus.id))
        .orderBy(desc(visits.createdAt))
        .$dynamic();

    let countQuery = db
        .select({ total: count() })
        .from(visits)
        .leftJoin(users, eq(visits.sales_id, users.id))
        .leftJoin(visitStatus, eq(visits.status_id, visitStatus.id))
        .$dynamic();

    if (whereConditions.length > 0) {
        baseQuery = baseQuery.where(and(...whereConditions));
        countQuery = countQuery.where(and(...whereConditions));
    }

    const [allVisitsRaw, [{ total: totalCount }]] = await Promise.all([
        baseQuery.limit(limit).offset(offset),
        countQuery
    ]);

    const enrichedVisits = await enrichRecordsWithProducts(allVisitsRaw);

    const allVisits = enrichedVisits.map((visit) => ({
        ...visit,
        map_link: `https://www.google.com/maps/search/?api=1&query=${visit.lat},${visit.lng}`
    }));

    SuccessResponse(res, { 
        allVisits,
        pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit)
        }
    }, 200);
};

// ✅ Get All Sales (Visits with status != 'visit')
export const getAllSales = async (req: Request, res: Response) => {  
    await getAllVisitsSchema.parseAsync({ query: req.query });
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const querySalesId = req.query.sales_id as string;
    const queryStatusId = req.query.status_id as string;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    
    const fromDateStr = req.query.from as string;
    const toDateStr = req.query.to as string;

    const offset = (page - 1) * limit;

    let whereConditions: SQL[] = [];

    whereConditions.push(ne(visits.status, "visit"));
    if (queryStatusId) {
        whereConditions.push(eq(visits.status_id, queryStatusId));
    }

    if (userRole === "admin") {
        if (querySalesId) {
            whereConditions.push(eq(visits.sales_id, querySalesId));
        }
    } else if (((userRole && isLeader(userRole)) || userRole === "leader_sales")) {
        const teamSales = await db
            .select({ id: users.id })
            .from(users)
            .where(
                or(
                    and(eq(users.leader_id, userId!), eq(users.role, "sales")), 
                    eq(users.id, userId!)
                )
            );
        
        const salesIds = teamSales.map(s => s.id);

        if (querySalesId) {
            if (salesIds.includes(querySalesId)) {
                whereConditions.push(eq(visits.sales_id, querySalesId));
            } else {
                throw new BadRequest("You do not have access to this sales member's visits.");
            }
        } else {
            if (salesIds.length > 0) {
                whereConditions.push(inArray(visits.sales_id, salesIds));
            } else {
                return SuccessResponse(res, { allVisits: [], pagination: { total: 0, page, limit, totalPages: 0 } }, 200);
            }
        }
    } else if (userRole === "sales") {
        whereConditions.push(eq(visits.sales_id, userId!));
    } else {
        throw new BadRequest("Unauthorized role");
    }

    if (search) {
        const searchPattern = `%${search}%`;
        whereConditions.push(
            or(
                like(visits.name, searchPattern),
                like(visits.owner_name, searchPattern),
                like(visits.phone, searchPattern),
                like(visits.owner_phone, searchPattern),
                like(users.name, searchPattern),
                like(users.email, searchPattern),
                like(users.phone, searchPattern)
            ) as SQL
        );
    }

    if (fromDateStr) {
        const fromDate = new Date(`${fromDateStr}T00:00:00.000Z`);
        if (!isNaN(fromDate.getTime())) {
            whereConditions.push(gte(visits.createdAt, fromDate));
        }
    }

    if (toDateStr) {
        const toDate = new Date(`${toDateStr}T23:59:59.999Z`);
        if (!isNaN(toDate.getTime())) {
            whereConditions.push(lte(visits.createdAt, toDate));
        }
    }

    const monthsParam = req.query.months as string;
    const yearParam = req.query.year as string;
    if (monthsParam && yearParam) {
        const months = monthsParam.split(',').map(Number).filter(m => !isNaN(m));
        const year = Number(yearParam);
        if (months.length > 0 && !isNaN(year)) {
            whereConditions.push(inArray(sql`MONTH(${visits.createdAt})`, months));
            whereConditions.push(eq(sql`YEAR(${visits.createdAt})`, year));
        }
    }

    let baseQuery = db
        .select({
            id: visits.id, 
            lat: visits.lat,
            lng: visits.lng,
            name: visits.name,
            owner_name: visits.owner_name,
            owner_phone: visits.owner_phone,
            address: visits.address,
            notes: visits.notes,
            phone: visits.phone,
            points: visits.points,
            status: visits.status,
            visit_status: visitStatus.name,
            status_id: visits.status_id,
            sales_id: users.id,
            sales: users.name,
            sales_phone: users.phone,
            products: visits.products,
            createdAt: visits.createdAt
        })
        .from(visits)
        .leftJoin(users, eq(visits.sales_id, users.id))
        .leftJoin(visitStatus, eq(visits.status_id, visitStatus.id))
        .orderBy(desc(visits.createdAt))
        .$dynamic();

    let countQuery = db
        .select({ total: count() })
        .from(visits)
        .leftJoin(users, eq(visits.sales_id, users.id))
        .leftJoin(visitStatus, eq(visits.status_id, visitStatus.id))
        .$dynamic();

    if (whereConditions.length > 0) {
        baseQuery = baseQuery.where(and(...whereConditions));
        countQuery = countQuery.where(and(...whereConditions));
    }

    const [allVisitsRaw, [{ total: totalCount }]] = await Promise.all([
        baseQuery.limit(limit).offset(offset),
        countQuery
    ]);

    const enrichedVisits = await enrichRecordsWithProducts(allVisitsRaw);

    const allVisits = enrichedVisits.map((visit) => ({
        ...visit,
        map_link: `https://www.google.com/maps/search/?api=1&query=${visit.lat},${visit.lng}`
    }));

    SuccessResponse(res, { 
        allVisits,
        pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit)
        }
    }, 200);
};

export const getVisitsCounts = async (req: Request, res: Response) => {
    await getAllVisitsSchema.parseAsync({ query: req.query });
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const querySalesId = req.query.sales_id as string;
    const queryStatusId = req.query.status_id as string;

    const search = (req.query.search as string) || '';
    const fromDateStr = req.query.from as string;
    const toDateStr = req.query.to as string;

    let whereConditions: SQL[] = [];
    let leadsWhereConditions: SQL[] = [];

    if (queryStatusId) {
        whereConditions.push(eq(visits.status_id, queryStatusId));
    }

    if (userRole === "admin") {
        if (querySalesId) {
            whereConditions.push(eq(visits.sales_id, querySalesId));
            leadsWhereConditions.push(eq(leads.sales_id, querySalesId));
        }
    } else if (((userRole && isLeader(userRole)) || userRole === "leader_sales")) {
        const teamSales = await db
            .select({ id: users.id })
            .from(users)
            .where(
                or(
                    and(eq(users.leader_id, userId!), eq(users.role, "sales")), 
                    eq(users.id, userId!)
                )
            );
        
        const salesIds = teamSales.map(s => s.id);
        const strictTeamIds = (
            await db
                .select({ id: users.id })
                .from(users)
                .where(and(eq(users.leader_id, userId!), eq(users.role, "sales")))
        ).map(s => s.id);

        if (strictTeamIds.length > 0) {
            leadsWhereConditions.push(inArray(leads.sales_id, strictTeamIds));
        } else {
            leadsWhereConditions.push(sql`1 = 0`);
        }

        if (querySalesId) {
            if (salesIds.includes(querySalesId)) {
                whereConditions.push(eq(visits.sales_id, querySalesId));
            } else {
                throw new BadRequest("You do not have access to this sales member's visits.");
            }
        } else {
            if (salesIds.length > 0) {
                whereConditions.push(inArray(visits.sales_id, salesIds));
            } else {
                return SuccessResponse(res, { visitCount: 0, notVisitCount: 0, total: 0, leadsCount: 0 }, 200);
            }
        }
    } else if (userRole === "sales") {
        whereConditions.push(eq(visits.sales_id, userId!));
        leadsWhereConditions.push(eq(leads.sales_id, userId!));
    } else {
        throw new BadRequest("Unauthorized role");
    }

    if (search) {
        const searchPattern = `%${search}%`;
        whereConditions.push(
            or(
                like(visits.name, searchPattern),
                like(visits.phone, searchPattern),
                like(users.name, searchPattern),
                like(users.email, searchPattern),
                like(users.phone, searchPattern)
            ) as SQL
        );
    }

    if (fromDateStr) {
        const fromDate = new Date(`${fromDateStr}T00:00:00.000Z`);
        if (!isNaN(fromDate.getTime())) {
            whereConditions.push(gte(visits.createdAt, fromDate));
        }
    }

    if (toDateStr) {
        const toDate = new Date(`${toDateStr}T23:59:59.999Z`);
        if (!isNaN(toDate.getTime())) {
            whereConditions.push(lte(visits.createdAt, toDate));
        }
    }

    const [countsResult] = await db
        .select({
            visitCount: sql<number>`COALESCE(COUNT(CASE WHEN ${visits.status} = 'visit' THEN 1 END), 0)`,
            notVisitCount: sql<number>`COALESCE(COUNT(CASE WHEN ${visits.status} != 'visit' THEN 1 END), 0)`,
        })
        .from(visits)
        .leftJoin(users, eq(visits.sales_id, users.id))
        .leftJoin(visitStatus, eq(visits.status_id, visitStatus.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const visitCount = Number(countsResult?.visitCount || 0);
    const notVisitCount = Number(countsResult?.notVisitCount || 0);
    const wishListsCount = (
        await db
            .select({
                id: wishList.id
            })
            .from(wishList)
    ).length;

    const [{ totalLeads }] = await db
        .select({ totalLeads: count() })
        .from(leads)
        .where(leadsWhereConditions.length > 0 ? and(...leadsWhereConditions) : undefined);

    SuccessResponse(res, { 
        visitCount,
        salesCount: notVisitCount,
        total: visitCount + notVisitCount,
        wishListsCount,
        leadsCount: Number(totalLeads || 0),
    }, 200);
};

// ✅ Get Active Visit Statuses & Sales List
export const lists = async (req: Request, res: Response) => { 
    const visit_status = await db
        .select({
            id: visitStatus.id,  
            name: visitStatus.name,  
        })
        .from(visitStatus)
        .where(eq(visitStatus.status, true));  
    const userId = req.user?.id;

    type SalesUser = {
        id: typeof users.$inferSelect.id;
        name: typeof users.$inferSelect.name;
        phone: typeof users.$inferSelect.phone;
    };

    let sales: SalesUser[] = [];

    if ((req.user && isLeader(req.user.role)) && userId) {
        sales = await db
            .select({
                id: users.id,
                name: users.name,
                phone: users.phone,
            })
            .from(users)
            .where(
                or(
                    and(eq(users.leader_id, userId), eq(users.role, "sales")),
                    eq(users.id, userId)
                )
            );
    } else {
        sales = await db
            .select({
                id: users.id,
                name: users.name,
                phone: users.phone,
            })
            .from(users)
            .where(eq(users.role, "sales"));
    }
    SuccessResponse(res, { visit_status, sales }, 200);
}; 

// ✅ Get Visits By ID
export const getVisitsById = async (req: Request, res: Response) => {
    const validated = await VisitIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 

    const visitRaw = await db
        .select({
            id: visits.id, 
            lat: visits.lat,
            lng: visits.lng,
            name: visits.name, 
            owner_name: visits.owner_name,
            owner_phone: visits.owner_phone,
            address: visits.address,
            notes: visits.notes,
            phone: visits.phone,
            points: visits.points,
            status: visits.status,
            status_id: visits.status_id,
            sales_id: visits.sales_id,
            products: visits.products,
        })
        .from(visits) 
        .where(getProjectId(req) ? and(eq(visits.id, id), eq(visits.sales_project_id, getProjectId(req)!)) : eq(visits.id, id))
        .limit(1);

    if (!visitRaw[0]) {
        throw new NotFound("Visit not found");
    }

    if (req.user?.role === "sales" && visitRaw[0].sales_id !== req.user.id) {
        throw new BadRequest("You do not have permission to access this visit.");
    }

    const [enriched] = await enrichRecordsWithProducts([visitRaw[0]]);

    const visit = {
        ...enriched,
        map_link: `https://www.google.com/maps/search/?api=1&query=${visitRaw[0].lat},${visitRaw[0].lng}`
    };

    SuccessResponse(res, { Visit: visit }, 200);
};

// ✅ Create Visits
export const createVisits = async (req: Request, res: Response) => {
    const validated = await createVisitSchema(req.user?.role).parseAsync({ body: req.body });
    const { lat, lng, name, address, notes, phone, status_id, owner_name, owner_phone } = validated.body;
    
    let status = "visit";
    if (((req.user && isLeader(req.user.role)) || req.user?.role === "admin") && req.body.status) {
        status = req.body.status;
    }

    let sales_id: any;

    if (req.user?.role === "sales") {
        sales_id = req.user.id;
    } else if ((req.user && isLeader(req.user.role))) {
        sales_id = validated.body.sales_id || req.user.id;
    } else {
        sales_id = validated.body.sales_id;
    }

    if (!sales_id) {
        throw new BadRequest("sales_id is required.");
    }

    const salesExist = await db
        .select({ id: users.id })
        .from(users)
        .where(
            and(
                eq(users.id, sales_id), 
                or(eq(users.role, "sales"), eq(users.role, "leader_sales"))
            )
        )
        .limit(1);

    if (!salesExist[0]) {
        throw new BadRequest("The assigned sales_id does not exist or user is not a sales member/leader.");
    }

    if (status_id) {
        const statusExist = await db
            .select({ id: visitStatus.id })
            .from(visitStatus)
            .where(and(eq(visitStatus.id, status_id), eq(visitStatus.status, true)))
            .limit(1);

        if (!statusExist[0]) {
            throw new BadRequest("The assigned status_id does not exist or is inactive.");
        }
    }

    let visitProducts: VisitProductItem[] = [];
    if (validated.body.products && Array.isArray(validated.body.products)) {
        visitProducts = parseProductsArray(validated.body.products);
    } else if (validated.body.product_id) {
        visitProducts = [{
            product_id: validated.body.product_id,
            duration: validated.body.duration || "",
        }];
    }

    const insertData: any = { 
        lat,
        lng,
        name,
        owner_name: owner_name || null,
        owner_phone: owner_phone || null,
        address,
        notes: notes || null,
        phone,
        status: status as any, 
        status_id: status_id || null,
        sales_id,
        products: visitProducts,
        points: 0,
        sales_project_id: (req.salesProjectId || req.headers["x-sales-project-id"] || getProjectId(req)),
    };
    
    if ((status === "sales" || status === "delivered") && visitProducts.length > 0 && ((req.user && isLeader(req.user.role)) || req.user?.role === "admin")) {
        insertData.points = await calculatePointsForProducts(visitProducts);
    }

    await db.insert(visits).values(insertData);

    SuccessResponse(res, { message: "Visit created successfully" }, 201);
};

// ✅ Update Visits
export const updateVisits = async (req: Request, res: Response) => {
    const validated = await updateVisitSchema.parseAsync({ 
        params: req.params, 
        body: req.body 
    });
    const { id } = validated.params;
    const { lat, lng, name, address, notes, phone, status, status_id, owner_name, owner_phone } = validated.body;
  
    const existingVisit = await db
        .select()
        .from(visits)
        .where(getProjectId(req) ? and(eq(visits.id, id), eq(visits.sales_project_id, getProjectId(req)!)) : eq(visits.id, id))
        .limit(1);

    const currentVisit = existingVisit[0];

    if (!currentVisit) {
        throw new NotFound("Visit not found");
    }

    if (req.user?.role === "sales" && currentVisit.sales_id !== req.user.id) {
        throw new BadRequest("You do not have permission to modify this visit.");
    }

    let sales_id = req.body.sales_id;

    if (sales_id !== undefined && sales_id !== null) {
        const salesExist = await db
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.id, sales_id), 
            or(eq(users.role, "sales"), eq(users.role, "leader_sales"))))
            .limit(1);

        if (!salesExist[0]) {
            throw new BadRequest("The updated sales_id does not exist.");
        }
    }

    if (status_id !== undefined && status_id !== null) {
        const statusExist = await db
            .select({ id: visitStatus.id })
            .from(visitStatus)
            .where(and(eq(visitStatus.id, status_id), eq(visitStatus.status, true)))
            .limit(1);

        if (!statusExist[0]) {
            throw new BadRequest("The updated status_id does not exist.");
        }
    }

    const updateData: Record<string, any> = {};
    if (lat !== undefined) updateData.lat = lat;
    if (lng !== undefined) updateData.lng = lng;
    if (name !== undefined) updateData.name = name;
    if (owner_name !== undefined) updateData.owner_name = owner_name || null;
    if (owner_phone !== undefined) updateData.owner_phone = owner_phone || null;
    if (address !== undefined) updateData.address = address;
    if (notes !== undefined) updateData.notes = notes;
    if (phone !== undefined) updateData.phone = phone;
    if (status_id !== undefined) updateData.status_id = status_id;
    if (sales_id !== undefined && req.user?.role !== "sales") updateData.sales_id = sales_id;

    if (validated.body.products !== undefined) {
        updateData.products = parseProductsArray(validated.body.products);
    } else if (validated.body.product_id !== undefined && validated.body.product_id) {
        updateData.products = [{
            product_id: validated.body.product_id,
            duration: validated.body.duration || "",
        }];
    }

    const effectiveProducts = updateData.products !== undefined
        ? updateData.products
        : parseProductsArray(currentVisit.products);

    if (status !== undefined) {
        if (req.user?.role === "sales") {
            if (!req.user.id) {
                throw new BadRequest("User ID is missing.");
            }

            const request_item = await db
                .select({ id: statusRequest.id })
                .from(statusRequest)
                .where(
                    and(
                        eq(statusRequest.visitId, currentVisit.id),
                        eq(statusRequest.from, currentVisit.status as any), 
                        eq(statusRequest.to, status as any),               
                        eq(statusRequest.userId, req.user.id),
                        eq(statusRequest.status, "pending")
                    )
                )
                .limit(1);

            if (!request_item[0]) {
                await db.insert(statusRequest).values({
                    visitId: currentVisit.id,
                    from: currentVisit.status as "visit" | "sales" | "delivered",
                    to: status as "visit" | "sales" | "delivered",
                    userId: req.user.id,
                    status: "pending",
                });
            }
        } else {
            updateData.status = status;
            
            if (status === "sales" || status === "delivered") {
                updateData.points = await calculatePointsForProducts(effectiveProducts);
            } else {
                updateData.points = 0;
            }
        }
    } else if (updateData.products !== undefined && req.user?.role !== "sales") {
        if (currentVisit.status === "sales" || currentVisit.status === "delivered") {
            updateData.points = await calculatePointsForProducts(effectiveProducts);
        }
    }

    let updateConditions = eq(visits.id, id);
    if (req.user?.role === "sales") {
        updateConditions = and(eq(visits.id, id), eq(visits.sales_id, req.user.id)) as any;
    }

    if (Object.keys(updateData).length > 0) {
        await db.update(visits).set(updateData).where(updateConditions);
    }
    
    SuccessResponse(res, { message: "Visit updated successfully" }, 200);
};

// ✅ Delete Visits
export const deleteVisits = async (req: Request, res: Response) => {
    const validated = await VisitIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 
  
    const existingVisit = await db
        .select()
        .from(visits)
        .where(getProjectId(req) ? and(eq(visits.id, id), eq(visits.sales_project_id, getProjectId(req)!)) : eq(visits.id, id))
        .limit(1);

    if (!existingVisit[0]) {
        throw new NotFound("Visit not found");
    }

    let deleteConditions = eq(visits.id, id);
    if ((req.user && isLeader(req.user.role)) || req.user?.role === "sales") {
        deleteConditions = and(eq(visits.id, id), eq(visits.sales_id, req.user.id)) as any;
    }

    await db.delete(visits).where(deleteConditions);

    SuccessResponse(res, { message: "Visit deleted successfully" }, 200);
};