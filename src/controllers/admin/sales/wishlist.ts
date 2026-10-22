import { getProjectId, isLeader, isAdminRole } from "./helpers";
// src/controllers/Sales/SalesController.ts

import { Request, Response } from "express";
import { db } from "../../../models/db";
import { wishList, users, visits, visitStatus, products, salesProjectUsers } from "../../../models/schema";
import { eq, SQL, and, or, like, count, desc, inArray } from "drizzle-orm";
import { SuccessResponse } from "../../../utils/response";
import { NotFound } from "../../../Errors/NotFound";
import { BadRequest } from "../../../Errors/BadRequest";
import { z } from "zod"; 
import { parseProductsArray } from "./visits";

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================

const wishListProductItemSchema = z.object({
  product_id: z.string({ required_error: "Product ID is required" }).min(1, "Product ID cannot be empty"),
  duration: z.string().optional().default(""),
});

// الـ Schema الخاص بإنشاء WishList جديد
export const createWishListSchema = z.object({
  body: z.object({ 
    name: z.string({ required_error: "Name is required" })
      .min(1, "Name cannot be empty")
      .max(255, "Name cannot exceed 255 characters"),
    description: z.string().max(1000, "Description cannot exceed 1000 characters").nullable().optional(),
    sales_id: z.string().uuid("Invalid sales ID format").nullable().optional(),
  }),
});

// الـ Schema الخاص بتحديث WishList
export const updateWishListSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required in parameters" }).uuid("Invalid ID format"),
  }),
  body: z.object({ 
    name: z.string().min(1, "Name cannot be empty").max(255).optional(),
    description: z.string().max(1000, "Description cannot exceed 1000 characters").nullable().optional(),
    sales_id: z.string().uuid("Invalid sales ID format").nullable().optional(),
  }),
});

// الـ Schema الخاص بالعمليات التي تتطلب ID فقط
export const WishListIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required in parameters" }).uuid("Invalid ID format"),
  }),
}); 

export const getAllWishListSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    sales_id: z.string().optional(),
  }),
});

// الـ Schema الخاص بتحويل WishList إلى Visit
export const convertWishListSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required in parameters" }).uuid("Invalid ID format"),
  }),
  body: z.object({
    lat: z.coerce.number({ required_error: "Latitude (lat) is required" }).min(-90).max(90),
    lng: z.coerce.number({ required_error: "Longitude (lng) is required" }).min(-180).max(180),
    address: z.string({ required_error: "Address is required" }).min(1, "Address cannot be empty").max(500),
    owner_name: z.string().max(255).nullable().optional(),
    owner_phone: z.string().max(20).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
    phone: z.string({ required_error: "Phone is required" }).min(5, "Phone number is too short").max(20),
    status_id: z.string({ required_error: "Status ID is required" }).min(1, "Status ID cannot be empty"),
    products: z.array(wishListProductItemSchema).nullable().optional(),
  }),
});


// ==========================================
// 🎮 Controllers
// ==========================================

// ✅ Get Lists (sales: [id, name], visit_status: [id, name], products)
export const lists = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const role = req.user?.role;
    const projectId = getProjectId(req);

    let sales: { id: string; name: string }[] = [];

    // 1. If projectId is present, prioritize sales assigned to this project
    if (projectId) {
        const assignedSales = await db
            .select({
                id: users.id,
                name: users.name,
            })
            .from(salesProjectUsers)
            .innerJoin(users, eq(salesProjectUsers.user_id, users.id))
            .where(
                and(
                    eq(salesProjectUsers.sales_project_id, projectId),
                    eq(users.role, "sales")
                )
            );
        if (assignedSales.length > 0) {
            sales = assignedSales;
        }
    }

    // 2. If no project-specific sales found (or no projectId), fallback based on user role
    if (sales.length === 0) {
        if (((role && isLeader(role)) || role === "leader_sales" || role === "leader") && userId) {
            sales = await db
                .select({
                    id: users.id,
                    name: users.name,
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
                })
                .from(users)
                .where(eq(users.role, "sales"));
        }
    }

    const [visit_status, allProducts] = await Promise.all([
        db
            .select({
                id: visitStatus.id,
                name: visitStatus.name,
            })
            .from(visitStatus)
            .where(eq(visitStatus.status, true)),
        db
            .select({
                id: products.id,
                name: products.name,
                points: products.points,
            })
            .from(products),
    ]);

    SuccessResponse(res, { sales, visit_status, products: allProducts }, 200);
};

// ✅ Get All WishLists
export const getAllWishLists = async (req: Request, res: Response) => { 
    await getAllWishListSchema.parseAsync({ query: req.query });
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const querySalesId = req.query.sales_id as string;

    // استقبال معايير الـ Pagination والبحث
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    
    const offset = (page - 1) * limit;

    const projectId = getProjectId(req);
    let whereConditions: SQL[] = [];
    if (projectId) {
        whereConditions.push(eq(wishList.sales_project_id, projectId));
    }

    // 1. الفلترة حسب الدور أو sales_id المرسل في الـ Query
    if (userRole === "admin") {
        if (querySalesId) {
            whereConditions.push(eq(wishList.sales_id, querySalesId));
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
                whereConditions.push(eq(wishList.sales_id, querySalesId));
            } else {
                throw new BadRequest("You do not have access to this sales member's wishlists.");
            }
        } else if (salesIds.length > 0) {
            whereConditions.push(inArray(wishList.sales_id, salesIds));
        }
    } else if (userRole === "sales") {
        whereConditions.push(eq(wishList.sales_id, userId!));
    }

    // 2. تطبيق البحث (Search) باسم قائمة الأمنيات أو وصفها أو اسم المندوب
    if (search) {
        const searchPattern = `%${search}%`;
        whereConditions.push(
            or(
                like(wishList.name, searchPattern),
                like(wishList.description, searchPattern),
                like(users.name, searchPattern)
            ) as SQL
        );
    }

    // 3. بناء استعلام البيانات الأساسي (Base Query)
    let query = db
        .select({
            id: wishList.id, 
            name: wishList.name,
            description: wishList.description,
            sales_id: wishList.sales_id,
            sales: users.name,
            createdAt: wishList.createdAt
        })
        .from(wishList)
        .leftJoin(users, eq(wishList.sales_id, users.id))
        .orderBy(desc(wishList.createdAt))
        .$dynamic();

    // 4. بناء استعلام الـ Count لحساب العدد الإجمالي متوافقاً مع فلاتر البحث
    let countQuery = db
        .select({ total: count() })
        .from(wishList)
        .leftJoin(users, eq(wishList.sales_id, users.id))
        .$dynamic();

    // ربط الشروط بالاستعلامات
    if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions));
        countQuery = countQuery.where(and(...whereConditions));
    }

    // 5. تنفيذ الاستعلامين بالتوازي (Parallel Execution) لسرعة استجابة فائقة
    const [allWishLists, [{ total: totalCount }]] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery
    ]);
 
    // 6. إرسال النتيجة مع معلومات الـ Pagination الكاملة
    SuccessResponse(res, { 
        allWishLists,
        pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit)
        }
    }, 200);
};

// ✅ Get WishLists By ID
export const getWishListsById = async (req: Request, res: Response) => {
    const validated = await WishListIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 

    const WishLists = await db
        .select({
            id: wishList.id, 
            name: wishList.name, 
            description: wishList.description,
            sales_id: wishList.sales_id,
            sales: users.name,
        })
        .from(wishList)
        .leftJoin(users, eq(wishList.sales_id, users.id))
        .where(getProjectId(req) ? and(eq(wishList.id, id), eq(wishList.sales_project_id, getProjectId(req)!)) : eq(wishList.id, id))
        .limit(1);

    if (!WishLists[0]) {
        throw new NotFound("WishList not found");
    }

    SuccessResponse(res, { WishList: WishLists[0] }, 200);
};

// ✅ Create WishLists
export const createWishLists = async (req: Request, res: Response) => {
    const validated = await createWishListSchema.parseAsync({ body: req.body });
    const { name, description } = validated.body;

    let sales_id: string | null = null;
    if (req.user?.role === "sales") {
        sales_id = req.user.id;
    } else if ((req.user && isLeader(req.user.role))) {
        sales_id = validated.body.sales_id || req.user.id;
    } else {
        sales_id = validated.body.sales_id || null;
    }

    if (sales_id) {
        const salesExist = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.id, sales_id))
            .limit(1);

        if (!salesExist[0]) {
            throw new BadRequest("The assigned sales_id does not exist.");
        }
    }
    
    const projectId = getProjectId(req);
    await db.insert(wishList).values({
        id: crypto.randomUUID(),
        name,
        description: description || null,
        sales_id,
        sales_project_id: projectId,
    });

    SuccessResponse(res, { message: "WishList created successfully" }, 201);
};

// ✅ Update WishLists
export const updateWishLists = async (req: Request, res: Response) => {
    const validated = await updateWishListSchema.parseAsync({ 
        params: req.params, 
        body: req.body 
    });
    const { id } = validated.params;
    const { name, description, sales_id } = validated.body;
  
    // التأكد أولاً من وجود العنصر قبل التحديث
    const existingWishLists = await db
        .select()
        .from(wishList)
        .where(eq(wishList.id, id))
        .limit(1);

    if (!existingWishLists[0]) {
        throw new NotFound("WishList not found");
    }

    if (sales_id !== undefined && sales_id !== null) {
        const salesExist = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.id, sales_id))
            .limit(1);

        if (!salesExist[0]) {
            throw new BadRequest("The updated sales_id does not exist.");
        }
    }

    // بناء كائن التحديث ديناميكياً لتجنب إرسال قيم undefined
    const updateData: Partial<{ name: string; description: string | null; sales_id: string | null }> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (sales_id !== undefined) updateData.sales_id = sales_id;

    await db.update(wishList).set(updateData).where(getProjectId(req) ? and(eq(wishList.id, id), eq(wishList.sales_project_id, getProjectId(req)!)) : eq(wishList.id, id));

    SuccessResponse(res, { message: "WishList updated successfully" }, 200);
};

// ✅ Delete WishLists
export const deleteWishLists = async (req: Request, res: Response) => {
    const validated = await WishListIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 

    const existingWishLists = await db
        .select()
        .from(wishList)
        .where(eq(wishList.id, id))
        .limit(1);

    if (!existingWishLists[0]) {
        throw new NotFound("WishList not found");
    }
 
    await db.delete(wishList).where(getProjectId(req) ? and(eq(wishList.id, id), eq(wishList.sales_project_id, getProjectId(req)!)) : eq(wishList.id, id));

    SuccessResponse(res, { message: "WishList deleted successfully" }, 200);
};

// ✅ Convert WishList to Visit (copies name & sales_id from wishList + extra fields into visits and deletes from wishList)
export const convertWishListToVisit = async (req: Request, res: Response) => {
    const validated = await convertWishListSchema.parseAsync({
        params: req.params,
        body: req.body,
    });
    const { id } = validated.params;
    const {
        lat,
        lng,
        address,
        owner_name,
        owner_phone,
        notes,
        phone,
        status_id,
        products: bodyProducts,
    } = validated.body;

    const role = req.user?.role;
    const userId = req.user?.id;

    const existingRows = await db
        .select({
            item: wishList,
            leader_id: users.leader_id,
        })
        .from(wishList)
        .leftJoin(users, eq(wishList.sales_id, users.id))
        .where(eq(wishList.id, id))
        .limit(1);

    if (!existingRows[0]) {
        throw new NotFound("WishList not found");
    }

    const existingItem = existingRows[0].item;
    const existingLeaderId = existingRows[0].leader_id;

    if (role === "sales" && existingItem.sales_id && existingItem.sales_id !== userId) {
        throw new BadRequest("You do not have permission to convert this wish list.");
    }
    if (
        ((role && isLeader(role)) || role === "leader_sales") &&
        existingItem.sales_id &&
        existingItem.sales_id !== userId &&
        existingLeaderId !== userId
    ) {
        throw new BadRequest("You do not have permission to convert this wish list.");
    }

    const finalSalesId = existingItem.sales_id || userId;
    if (!finalSalesId) {
        throw new BadRequest("WishList has no assigned sales_id.");
    }

    // Validate status_id is an active visitStatus
    const statusExist = await db
        .select({ id: visitStatus.id })
        .from(visitStatus)
        .where(and(eq(visitStatus.id, status_id), eq(visitStatus.status, true)))
        .limit(1);

    if (!statusExist[0]) {
        throw new BadRequest("The assigned status_id does not exist or is inactive.");
    }

    const visitProducts = parseProductsArray(bodyProducts);
    const projectId = getProjectId(req);

    await db.transaction(async (tx) => {
        await tx.insert(visits).values({
            id: crypto.randomUUID(),
            lat: Number(lat),
            lng: Number(lng),
            name: existingItem.name,
            sales_id: finalSalesId,
            address,
            owner_name: owner_name || null,
            owner_phone: owner_phone || null,
            notes: notes !== undefined && notes !== null ? notes : existingItem.description || null,
            phone,
            status_id,
            points: 0,
            status: "visit",
            products: visitProducts,
            sales_project_id: projectId,
        });

        await tx.delete(wishList).where(getProjectId(req) ? and(eq(wishList.id, id), eq(wishList.sales_project_id, getProjectId(req)!)) : eq(wishList.id, id));
    });

    SuccessResponse(
        res,
        { message: "WishList converted to visit successfully" },
        200
    );
};