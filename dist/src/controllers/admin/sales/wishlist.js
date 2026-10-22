"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertWishListToVisit = exports.deleteWishLists = exports.updateWishLists = exports.createWishLists = exports.getWishListsById = exports.getAllWishLists = exports.lists = exports.convertWishListSchema = exports.getAllWishListSchema = exports.WishListIdSchema = exports.updateWishListSchema = exports.createWishListSchema = void 0;
const helpers_1 = require("./helpers");
const db_1 = require("../../../models/db");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../../utils/response");
const NotFound_1 = require("../../../Errors/NotFound");
const BadRequest_1 = require("../../../Errors/BadRequest");
const zod_1 = require("zod");
const visits_1 = require("./visits");
// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
const wishListProductItemSchema = zod_1.z.object({
    product_id: zod_1.z.string({ required_error: "Product ID is required" }).min(1, "Product ID cannot be empty"),
    duration: zod_1.z.string().optional().default(""),
});
// الـ Schema الخاص بإنشاء WishList جديد
exports.createWishListSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({ required_error: "Name is required" })
            .min(1, "Name cannot be empty")
            .max(255, "Name cannot exceed 255 characters"),
        description: zod_1.z.string().max(1000, "Description cannot exceed 1000 characters").nullable().optional(),
        sales_id: zod_1.z.string().nullable().optional().transform(v => (!v || v.trim() === "" ? null : v)),
    }),
});
// الـ Schema الخاص بتحديث WishList
exports.updateWishListSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required in parameters" }).uuid("Invalid ID format"),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, "Name cannot be empty").max(255).optional(),
        description: zod_1.z.string().max(1000, "Description cannot exceed 1000 characters").nullable().optional(),
        sales_id: zod_1.z.string().nullable().optional().transform(v => (!v || v.trim() === "" ? null : v)),
    }),
});
// الـ Schema الخاص بالعمليات التي تتطلب ID فقط
exports.WishListIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required in parameters" }).uuid("Invalid ID format"),
    }),
});
exports.getAllWishListSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().positive().optional(),
        limit: zod_1.z.coerce.number().int().positive().optional(),
        search: zod_1.z.string().optional(),
        sales_id: zod_1.z.string().optional(),
    }),
});
// الـ Schema الخاص بتحويل WishList إلى Visit
exports.convertWishListSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required in parameters" }).uuid("Invalid ID format"),
    }),
    body: zod_1.z.object({
        lat: zod_1.z.coerce.number({ required_error: "Latitude (lat) is required" }).min(-90).max(90),
        lng: zod_1.z.coerce.number({ required_error: "Longitude (lng) is required" }).min(-180).max(180),
        address: zod_1.z.string({ required_error: "Address is required" }).min(1, "Address cannot be empty").max(500),
        owner_name: zod_1.z.string().max(255).nullable().optional(),
        owner_phone: zod_1.z.string().max(20).nullable().optional(),
        notes: zod_1.z.string().max(1000).nullable().optional(),
        phone: zod_1.z.string({ required_error: "Phone is required" }).min(5, "Phone number is too short").max(20),
        status_id: zod_1.z.string({ required_error: "Status ID is required" }).min(1, "Status ID cannot be empty"),
        products: zod_1.z.array(wishListProductItemSchema).nullable().optional(),
    }),
});
// ==========================================
// 🎮 Controllers
// ==========================================
// ✅ Get Lists (sales: [id, name], visit_status: [id, name], products)
const lists = async (req, res) => {
    const userId = req.user?.id;
    const role = req.user?.role;
    const projectId = (0, helpers_1.getProjectId)(req);
    let sales = [];
    // 1. If projectId is present, prioritize sales assigned to this project
    if (projectId) {
        const assignedSales = await db_1.db
            .select({
            id: schema_1.users.id,
            name: schema_1.users.name,
        })
            .from(schema_1.salesProjectUsers)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.salesProjectUsers.user_id, schema_1.users.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.salesProjectUsers.sales_project_id, projectId), (0, drizzle_orm_1.eq)(schema_1.users.role, "sales")));
        if (assignedSales.length > 0) {
            sales = assignedSales;
        }
    }
    // 2. If no project-specific sales found (or no projectId), fallback based on user role
    if (sales.length === 0) {
        if (((role && (0, helpers_1.isLeader)(role)) || role === "leader_sales" || role === "leader") && userId) {
            sales = await db_1.db
                .select({
                id: schema_1.users.id,
                name: schema_1.users.name,
            })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.leader_id, userId), (0, drizzle_orm_1.eq)(schema_1.users.role, "sales")), (0, drizzle_orm_1.eq)(schema_1.users.id, userId)));
        }
        else {
            sales = await db_1.db
                .select({
                id: schema_1.users.id,
                name: schema_1.users.name,
            })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.role, "sales"));
        }
    }
    const [visit_status, allProducts] = await Promise.all([
        db_1.db
            .select({
            id: schema_1.visitStatus.id,
            name: schema_1.visitStatus.name,
        })
            .from(schema_1.visitStatus)
            .where((0, drizzle_orm_1.eq)(schema_1.visitStatus.status, true)),
        db_1.db
            .select({
            id: schema_1.products.id,
            name: schema_1.products.name,
            points: schema_1.products.points,
        })
            .from(schema_1.products),
    ]);
    (0, response_1.SuccessResponse)(res, { sales, visit_status, products: allProducts }, 200);
};
exports.lists = lists;
// ✅ Get All WishLists
const getAllWishLists = async (req, res) => {
    await exports.getAllWishListSchema.parseAsync({ query: req.query });
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const querySalesId = req.query.sales_id;
    // استقبال معايير الـ Pagination والبحث
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;
    const projectId = (0, helpers_1.getProjectId)(req);
    let whereConditions = [];
    if (projectId) {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.wishList.sales_project_id, projectId));
    }
    // 1. الفلترة حسب الدور أو sales_id المرسل في الـ Query
    if (userRole === "admin") {
        if (querySalesId) {
            whereConditions.push((0, drizzle_orm_1.eq)(schema_1.wishList.sales_id, querySalesId));
        }
    }
    else if (((userRole && (0, helpers_1.isLeader)(userRole)) || userRole === "leader_sales")) {
        const teamSales = await db_1.db
            .select({ id: schema_1.users.id })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.leader_id, userId), (0, drizzle_orm_1.eq)(schema_1.users.role, "sales")), (0, drizzle_orm_1.eq)(schema_1.users.id, userId)));
        const salesIds = teamSales.map(s => s.id);
        if (querySalesId) {
            if (salesIds.includes(querySalesId)) {
                whereConditions.push((0, drizzle_orm_1.eq)(schema_1.wishList.sales_id, querySalesId));
            }
            else {
                throw new BadRequest_1.BadRequest("You do not have access to this sales member's wishlists.");
            }
        }
        else if (salesIds.length > 0) {
            whereConditions.push((0, drizzle_orm_1.inArray)(schema_1.wishList.sales_id, salesIds));
        }
    }
    else if (userRole === "sales") {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.wishList.sales_id, userId));
    }
    // 2. تطبيق البحث (Search) باسم قائمة الأمنيات أو وصفها أو اسم المندوب
    if (search) {
        const searchPattern = `%${search}%`;
        whereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.wishList.name, searchPattern), (0, drizzle_orm_1.like)(schema_1.wishList.description, searchPattern), (0, drizzle_orm_1.like)(schema_1.users.name, searchPattern)));
    }
    // 3. بناء استعلام البيانات الأساسي (Base Query)
    let query = db_1.db
        .select({
        id: schema_1.wishList.id,
        name: schema_1.wishList.name,
        description: schema_1.wishList.description,
        sales_id: schema_1.wishList.sales_id,
        sales: schema_1.users.name,
        createdAt: schema_1.wishList.createdAt
    })
        .from(schema_1.wishList)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.wishList.sales_id, schema_1.users.id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.wishList.createdAt))
        .$dynamic();
    // 4. بناء استعلام الـ Count لحساب العدد الإجمالي متوافقاً مع فلاتر البحث
    let countQuery = db_1.db
        .select({ total: (0, drizzle_orm_1.count)() })
        .from(schema_1.wishList)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.wishList.sales_id, schema_1.users.id))
        .$dynamic();
    // ربط الشروط بالاستعلامات
    if (whereConditions.length > 0) {
        query = query.where((0, drizzle_orm_1.and)(...whereConditions));
        countQuery = countQuery.where((0, drizzle_orm_1.and)(...whereConditions));
    }
    // 5. تنفيذ الاستعلامين بالتوازي (Parallel Execution) لسرعة استجابة فائقة
    const [allWishLists, [{ total: totalCount }]] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery
    ]);
    // 6. إرسال النتيجة مع معلومات الـ Pagination الكاملة
    (0, response_1.SuccessResponse)(res, {
        allWishLists,
        pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit)
        }
    }, 200);
};
exports.getAllWishLists = getAllWishLists;
// ✅ Get WishLists By ID
const getWishListsById = async (req, res) => {
    const validated = await exports.WishListIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const WishLists = await db_1.db
        .select({
        id: schema_1.wishList.id,
        name: schema_1.wishList.name,
        description: schema_1.wishList.description,
        sales_id: schema_1.wishList.sales_id,
        sales: schema_1.users.name,
    })
        .from(schema_1.wishList)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.wishList.sales_id, schema_1.users.id))
        .where((0, drizzle_orm_1.eq)(schema_1.wishList.id, id))
        .limit(1);
    if (!WishLists[0]) {
        throw new NotFound_1.NotFound("WishList not found");
    }
    (0, response_1.SuccessResponse)(res, { WishList: WishLists[0] }, 200);
};
exports.getWishListsById = getWishListsById;
// ✅ Create WishLists
const createWishLists = async (req, res) => {
    const validated = await exports.createWishListSchema.parseAsync({ body: req.body });
    const { name, description } = validated.body;
    let sales_id = null;
    if (req.user?.role === "sales") {
        sales_id = req.user.id;
    }
    else if ((req.user && (0, helpers_1.isLeader)(req.user.role))) {
        sales_id = validated.body.sales_id || req.user.id;
    }
    else {
        sales_id = validated.body.sales_id || null;
    }
    if (sales_id) {
        const salesExist = await db_1.db
            .select({ id: schema_1.users.id })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, sales_id))
            .limit(1);
        if (!salesExist[0]) {
            throw new BadRequest_1.BadRequest("The assigned sales_id does not exist.");
        }
    }
    const projectId = (0, helpers_1.getProjectId)(req);
    await db_1.db.insert(schema_1.wishList).values({
        id: crypto.randomUUID(),
        name,
        description: description || null,
        sales_id,
        sales_project_id: projectId,
    });
    (0, response_1.SuccessResponse)(res, { message: "WishList created successfully" }, 201);
};
exports.createWishLists = createWishLists;
// ✅ Update WishLists
const updateWishLists = async (req, res) => {
    const validated = await exports.updateWishListSchema.parseAsync({
        params: req.params,
        body: req.body
    });
    const { id } = validated.params;
    const { name, description, sales_id } = validated.body;
    // التأكد أولاً من وجود العنصر قبل التحديث
    const existingWishLists = await db_1.db
        .select()
        .from(schema_1.wishList)
        .where((0, drizzle_orm_1.eq)(schema_1.wishList.id, id))
        .limit(1);
    if (!existingWishLists[0]) {
        throw new NotFound_1.NotFound("WishList not found");
    }
    if (sales_id !== undefined && sales_id !== null) {
        const salesExist = await db_1.db
            .select({ id: schema_1.users.id })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, sales_id))
            .limit(1);
        if (!salesExist[0]) {
            throw new BadRequest_1.BadRequest("The updated sales_id does not exist.");
        }
    }
    // بناء كائن التحديث ديناميكياً لتجنب إرسال قيم undefined
    const updateData = {};
    if (name !== undefined)
        updateData.name = name;
    if (description !== undefined)
        updateData.description = description;
    if (sales_id !== undefined)
        updateData.sales_id = sales_id;
    await db_1.db.update(schema_1.wishList).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.wishList.id, id));
    (0, response_1.SuccessResponse)(res, { message: "WishList updated successfully" }, 200);
};
exports.updateWishLists = updateWishLists;
// ✅ Delete WishLists
const deleteWishLists = async (req, res) => {
    const validated = await exports.WishListIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const existingWishLists = await db_1.db
        .select()
        .from(schema_1.wishList)
        .where((0, drizzle_orm_1.eq)(schema_1.wishList.id, id))
        .limit(1);
    if (!existingWishLists[0]) {
        throw new NotFound_1.NotFound("WishList not found");
    }
    await db_1.db.delete(schema_1.wishList).where((0, drizzle_orm_1.eq)(schema_1.wishList.id, id));
    (0, response_1.SuccessResponse)(res, { message: "WishList deleted successfully" }, 200);
};
exports.deleteWishLists = deleteWishLists;
// ✅ Convert WishList to Visit (copies name & sales_id from wishList + extra fields into visits and deletes from wishList)
const convertWishListToVisit = async (req, res) => {
    const validated = await exports.convertWishListSchema.parseAsync({
        params: req.params,
        body: req.body,
    });
    const { id } = validated.params;
    const { lat, lng, address, owner_name, owner_phone, notes, phone, status_id, products: bodyProducts, } = validated.body;
    const role = req.user?.role;
    const userId = req.user?.id;
    const existingRows = await db_1.db
        .select({
        item: schema_1.wishList,
        leader_id: schema_1.users.leader_id,
    })
        .from(schema_1.wishList)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.wishList.sales_id, schema_1.users.id))
        .where((0, drizzle_orm_1.eq)(schema_1.wishList.id, id))
        .limit(1);
    if (!existingRows[0]) {
        throw new NotFound_1.NotFound("WishList not found");
    }
    const existingItem = existingRows[0].item;
    const existingLeaderId = existingRows[0].leader_id;
    if (role === "sales" && existingItem.sales_id && existingItem.sales_id !== userId) {
        throw new BadRequest_1.BadRequest("You do not have permission to convert this wish list.");
    }
    if (((role && (0, helpers_1.isLeader)(role)) || role === "leader_sales") &&
        existingItem.sales_id &&
        existingItem.sales_id !== userId &&
        existingLeaderId !== userId) {
        throw new BadRequest_1.BadRequest("You do not have permission to convert this wish list.");
    }
    const finalSalesId = existingItem.sales_id || userId;
    if (!finalSalesId) {
        throw new BadRequest_1.BadRequest("WishList has no assigned sales_id.");
    }
    // Validate status_id is an active visitStatus
    const statusExist = await db_1.db
        .select({ id: schema_1.visitStatus.id })
        .from(schema_1.visitStatus)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.visitStatus.id, status_id), (0, drizzle_orm_1.eq)(schema_1.visitStatus.status, true)))
        .limit(1);
    if (!statusExist[0]) {
        throw new BadRequest_1.BadRequest("The assigned status_id does not exist or is inactive.");
    }
    const visitProducts = (0, visits_1.parseProductsArray)(bodyProducts);
    const projectId = (0, helpers_1.getProjectId)(req);
    await db_1.db.transaction(async (tx) => {
        await tx.insert(schema_1.visits).values({
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
        await tx.delete(schema_1.wishList).where((0, drizzle_orm_1.eq)(schema_1.wishList.id, id));
    });
    (0, response_1.SuccessResponse)(res, { message: "WishList converted to visit successfully" }, 200);
};
exports.convertWishListToVisit = convertWishListToVisit;
