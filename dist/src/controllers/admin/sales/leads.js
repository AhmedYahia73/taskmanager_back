"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertLeadToVisit = exports.deleteLead = exports.updateLead = exports.createLead = exports.getLeadById = exports.lists = exports.getAllLeads = exports.convertLeadSchema = exports.leadIdSchema = exports.updateLeadSchema = exports.createLeadSchema = void 0;
const helpers_1 = require("./helpers");
const db_1 = require("../../../models/db");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const BadRequest_1 = require("../../../Errors/BadRequest");
const Errors_1 = require("../../../Errors");
const response_1 = require("../../../utils/response");
const zod_1 = require("zod");
const visits_1 = require("./visits");
// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
const leadProductItemSchema = zod_1.z.object({
    product_id: zod_1.z
        .string({ required_error: "Product ID is required" })
        .min(1, "Product ID cannot be empty"),
    duration: zod_1.z.string().optional().default(""),
});
const createLeadSchema = (userRole) => zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z
            .string({ required_error: "Name is required" })
            .min(1, "Name cannot be empty")
            .max(255, "Name cannot exceed 255 characters"),
        phone: zod_1.z
            .string({ required_error: "Phone is required" })
            .min(5, "Phone number is too short")
            .max(20, "Phone cannot exceed 20 characters"),
        sales_id: userRole === "sales"
            ? zod_1.z.string().uuid("Invalid Sales ID format").optional()
            : zod_1.z
                .string({ required_error: "Sales ID is required" })
                .uuid("Invalid Sales ID format"),
        place_name: zod_1.z.string().max(255).nullable().optional(),
        place_phone: zod_1.z.string().max(20).nullable().optional(),
        lat: zod_1.z.coerce
            .number({ required_error: "Latitude (lat) is required" })
            .min(-90)
            .max(90),
        lng: zod_1.z.coerce
            .number({ required_error: "Longitude (lng) is required" })
            .min(-180)
            .max(180),
        address: zod_1.z
            .string({ required_error: "Address is required" })
            .min(1, "Address cannot be empty")
            .max(500, "Address cannot exceed 500 characters"),
        notes: zod_1.z.string().max(1000).nullable().optional(),
        products: zod_1.z.array(leadProductItemSchema).nullable().optional(),
        product_id: zod_1.z.string().nullable().optional(),
        duration: zod_1.z.string().nullable().optional(),
    }),
});
exports.createLeadSchema = createLeadSchema;
exports.updateLeadSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "Lead ID is required" }),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(255).optional(),
        phone: zod_1.z.string().min(5).max(20).optional(),
        sales_id: zod_1.z.string().uuid("Invalid Sales ID format").optional(),
        place_name: zod_1.z.string().max(255).nullable().optional(),
        place_phone: zod_1.z.string().max(20).nullable().optional(),
        lat: zod_1.z.coerce.number().min(-90).max(90).optional(),
        lng: zod_1.z.coerce.number().min(-180).max(180).optional(),
        address: zod_1.z.string().min(1).max(500).optional(),
        notes: zod_1.z.string().max(1000).nullable().optional(),
        products: zod_1.z.array(leadProductItemSchema).nullable().optional(),
        product_id: zod_1.z.string().nullable().optional(),
        duration: zod_1.z.string().nullable().optional(),
    }),
});
exports.leadIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "Lead ID is required" }),
    }),
});
exports.convertLeadSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "Lead ID is required" }),
    }),
    body: zod_1.z.object({
        status_id: zod_1.z
            .string({ required_error: "Status ID is required" })
            .min(1, "Status ID cannot be empty"),
        products: zod_1.z.array(leadProductItemSchema).optional(),
    }),
});
const validateProductsInput = async (rawProducts) => {
    const items = (0, visits_1.parseProductsArray)(rawProducts);
    for (const item of items) {
        const productExists = await db_1.db
            .select()
            .from(schema_1.products)
            .where((0, drizzle_orm_1.eq)(schema_1.products.id, item.product_id))
            .limit(1);
        if (productExists.length === 0) {
            throw new BadRequest_1.BadRequest(`Invalid product_id: ${item.product_id}`);
        }
    }
    return items;
};
// ==========================================
// 🎮 Controllers
// ==========================================
// ✅ Get all Leads (filtered by role: admin -> all, leader -> where sales.leader_id = my id, sales -> where sales_id = my id)
const getAllLeads = async (req, res) => {
    const role = req.user?.role;
    const userId = req.user?.id;
    let baseCondition = undefined;
    if (((role && (0, helpers_1.isLeader)(role)) || role === "leader_sales") && userId) {
        baseCondition = (0, drizzle_orm_1.eq)(schema_1.users.leader_id, userId);
    }
    else if (role === "sales" && userId) {
        baseCondition = (0, drizzle_orm_1.eq)(schema_1.leads.sales_id, userId);
    }
    const allLeads = await db_1.db
        .select({
        id: schema_1.leads.id,
        name: schema_1.leads.name,
        phone: schema_1.leads.phone,
        sales_id: schema_1.leads.sales_id,
        sales: schema_1.users.name,
        sales_phone: schema_1.users.phone,
        leader_id: schema_1.users.leader_id,
        place_name: schema_1.leads.place_name,
        place_phone: schema_1.leads.place_phone,
        lat: schema_1.leads.lat,
        lng: schema_1.leads.lng,
        address: schema_1.leads.address,
        notes: schema_1.leads.notes,
        products: schema_1.leads.products,
        createdAt: schema_1.leads.createdAt,
        updatedAt: schema_1.leads.updatedAt,
    })
        .from(schema_1.leads)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.leads.sales_id, schema_1.users.id))
        .where(baseCondition);
    const enriched = await (0, visits_1.enrichRecordsWithProducts)(allLeads);
    const leadsWithLinks = enriched.map((l) => ({
        ...l,
        map_link: `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`,
    }));
    (0, response_1.SuccessResponse)(res, { allLeads: leadsWithLinks, leads: leadsWithLinks }, 200);
};
exports.getAllLeads = getAllLeads;
// ✅ Lists for Leads (sales list based on role + products list)
const lists = async (req, res) => {
    const role = req.user?.role;
    const userId = req.user?.id;
    let salesList = [];
    if (((role && (0, helpers_1.isLeader)(role)) || role === "leader_sales" || role === "leader") && userId) {
        salesList = await db_1.db
            .select({
            id: schema_1.users.id,
            name: schema_1.users.name,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.role, "sales"), (0, drizzle_orm_1.eq)(schema_1.users.leader_id, userId)), (0, drizzle_orm_1.eq)(schema_1.users.id, userId)));
    }
    else {
        salesList = await db_1.db
            .select({
            id: schema_1.users.id,
            name: schema_1.users.name,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.role, "sales"));
    }
    const [allProducts, rawVisitStatus] = await Promise.all([
        db_1.db
            .select({
            id: schema_1.products.id,
            name: schema_1.products.name,
            points: schema_1.products.points,
        })
            .from(schema_1.products),
        db_1.db
            .select({
            id: schema_1.visitStatus.id,
            name: schema_1.visitStatus.name,
        })
            .from(schema_1.visitStatus)
            .where((0, drizzle_orm_1.eq)(schema_1.visitStatus.status, true)),
    ]);
    const healedVisitStatus = [];
    for (const st of rawVisitStatus) {
        if (!st.id || st.id.trim() === "") {
            const generatedId = crypto.randomUUID();
            await db_1.db.update(schema_1.visitStatus).set({ id: generatedId }).where((0, drizzle_orm_1.eq)(schema_1.visitStatus.name, st.name)).catch(() => { });
            healedVisitStatus.push({ ...st, id: generatedId });
        }
        else {
            healedVisitStatus.push(st);
        }
    }
    (0, response_1.SuccessResponse)(res, { sales: salesList, products: allProducts, visit_status: healedVisitStatus }, 200);
};
exports.lists = lists;
// ✅ Get Lead by ID (with role check)
const getLeadById = async (req, res) => {
    const validated = await exports.leadIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const role = req.user?.role;
    const userId = req.user?.id;
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.leads.id, id)];
    if (((role && (0, helpers_1.isLeader)(role)) || role === "leader_sales") && userId) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.users.leader_id, userId));
    }
    else if (role === "sales" && userId) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.leads.sales_id, userId));
    }
    const rows = await db_1.db
        .select({
        id: schema_1.leads.id,
        name: schema_1.leads.name,
        phone: schema_1.leads.phone,
        sales_id: schema_1.leads.sales_id,
        sales: schema_1.users.name,
        sales_phone: schema_1.users.phone,
        leader_id: schema_1.users.leader_id,
        place_name: schema_1.leads.place_name,
        place_phone: schema_1.leads.place_phone,
        lat: schema_1.leads.lat,
        lng: schema_1.leads.lng,
        address: schema_1.leads.address,
        notes: schema_1.leads.notes,
        products: schema_1.leads.products,
        createdAt: schema_1.leads.createdAt,
        updatedAt: schema_1.leads.updatedAt,
    })
        .from(schema_1.leads)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.leads.sales_id, schema_1.users.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .limit(1);
    if (rows.length === 0)
        throw new Errors_1.NotFound("Lead not found");
    const enriched = await (0, visits_1.enrichRecordsWithProducts)(rows);
    const lead = enriched[0];
    const leadWithMap = {
        ...lead,
        map_link: `https://www.google.com/maps/search/?api=1&query=${lead.lat},${lead.lng}`,
    };
    (0, response_1.SuccessResponse)(res, { Lead: leadWithMap, lead: leadWithMap }, 200);
};
exports.getLeadById = getLeadById;
// ✅ Create Lead
const createLead = async (req, res) => {
    const role = req.user?.role;
    const userId = req.user?.id;
    const validated = await (0, exports.createLeadSchema)(role).parseAsync({ body: req.body });
    const { name, phone, sales_id: bodySalesId, place_name, place_phone, lat, lng, address, notes, products: bodyProducts, product_id, duration, } = validated.body;
    let finalSalesId;
    if (role === "sales") {
        finalSalesId = userId;
    }
    else {
        finalSalesId = bodySalesId;
    }
    if (!finalSalesId) {
        throw new BadRequest_1.BadRequest("sales_id is required");
    }
    // Validate sales user exists and matches leader scope if leader
    const salesUser = await db_1.db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, finalSalesId), (0, drizzle_orm_1.eq)(schema_1.users.role, "sales")))
        .limit(1);
    if (salesUser.length === 0) {
        throw new BadRequest_1.BadRequest("Invalid sales_id — user not found or not a sales user");
    }
    if (((role && (0, helpers_1.isLeader)(role)) || role === "leader_sales") && salesUser[0].leader_id !== userId) {
        throw new BadRequest_1.BadRequest("You can only assign leads to sales users under your team");
    }
    const rawProductsInput = bodyProducts !== undefined
        ? bodyProducts
        : product_id
            ? [{ product_id, duration: duration || "" }]
            : [];
    const validatedProducts = await validateProductsInput(rawProductsInput);
    const projectId = (0, helpers_1.getProjectId)(req);
    const newLeadId = crypto.randomUUID();
    await db_1.db.insert(schema_1.leads).values({
        id: newLeadId,
        name,
        phone,
        sales_id: finalSalesId,
        place_name: place_name || null,
        place_phone: place_phone || null,
        lat: Number(lat),
        lng: Number(lng),
        address,
        notes: notes || null,
        products: validatedProducts,
        sales_project_id: projectId,
    });
    (0, response_1.SuccessResponse)(res, { message: "Lead created successfully" }, 201);
};
exports.createLead = createLead;
// ✅ Update Lead
const updateLead = async (req, res) => {
    const validated = await exports.updateLeadSchema.parseAsync({
        params: req.params,
        body: req.body,
    });
    const { id } = validated.params;
    const role = req.user?.role;
    const userId = req.user?.id;
    // Verify lead exists and user has permission
    const existingRows = await db_1.db
        .select({
        lead: schema_1.leads,
        leader_id: schema_1.users.leader_id,
    })
        .from(schema_1.leads)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.leads.sales_id, schema_1.users.id))
        .where((0, drizzle_orm_1.eq)(schema_1.leads.id, id))
        .limit(1);
    if (existingRows.length === 0) {
        throw new Errors_1.NotFound("Lead not found");
    }
    const existingLead = existingRows[0].lead;
    const existingLeaderId = existingRows[0].leader_id;
    if (((role && (0, helpers_1.isLeader)(role)) || role === "leader_sales") && existingLeaderId !== userId) {
        throw new Errors_1.NotFound("Lead not found or unauthorized");
    }
    if (role === "sales" && existingLead.sales_id !== userId) {
        throw new Errors_1.NotFound("Lead not found or unauthorized");
    }
    const { name, phone, sales_id: bodySalesId, place_name, place_phone, lat, lng, address, notes, products: bodyProducts, product_id, duration, } = validated.body;
    let finalSalesId = undefined;
    if (role === "sales") {
        finalSalesId = userId;
    }
    else if (bodySalesId !== undefined) {
        const salesUser = await db_1.db
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, bodySalesId), (0, drizzle_orm_1.eq)(schema_1.users.role, "sales")))
            .limit(1);
        if (salesUser.length === 0) {
            throw new BadRequest_1.BadRequest("Invalid sales_id — user not found or not a sales user");
        }
        if (((role && (0, helpers_1.isLeader)(role)) || role === "leader_sales") && salesUser[0].leader_id !== userId) {
            throw new BadRequest_1.BadRequest("You can only assign leads to sales users under your team");
        }
        finalSalesId = bodySalesId;
    }
    let validatedProducts = undefined;
    if (bodyProducts !== undefined) {
        validatedProducts = await validateProductsInput(bodyProducts);
    }
    else if (product_id !== undefined) {
        validatedProducts = await validateProductsInput(product_id ? [{ product_id, duration: duration || "" }] : []);
    }
    const updateData = {
        name: name ?? existingLead.name,
        phone: phone ?? existingLead.phone,
        sales_id: finalSalesId ?? existingLead.sales_id,
        place_name: place_name !== undefined ? place_name : existingLead.place_name,
        place_phone: place_phone !== undefined ? place_phone : existingLead.place_phone,
        lat: lat !== undefined ? Number(lat) : existingLead.lat,
        lng: lng !== undefined ? Number(lng) : existingLead.lng,
        address: address ?? existingLead.address,
        notes: notes !== undefined ? notes : existingLead.notes,
        products: validatedProducts !== undefined ? validatedProducts : existingLead.products,
    };
    await db_1.db.update(schema_1.leads).set(updateData).where((0, helpers_1.getProjectId)(req) ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.leads.id, id), (0, drizzle_orm_1.eq)(schema_1.leads.sales_project_id, (0, helpers_1.getProjectId)(req))) : (0, drizzle_orm_1.eq)(schema_1.leads.id, id));
    (0, response_1.SuccessResponse)(res, { message: "Lead updated successfully" }, 200);
};
exports.updateLead = updateLead;
// ✅ Delete Lead
const deleteLead = async (req, res) => {
    const validated = await exports.leadIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const role = req.user?.role;
    const userId = req.user?.id;
    const existingRows = await db_1.db
        .select({
        lead: schema_1.leads,
        leader_id: schema_1.users.leader_id,
    })
        .from(schema_1.leads)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.leads.sales_id, schema_1.users.id))
        .where((0, drizzle_orm_1.eq)(schema_1.leads.id, id))
        .limit(1);
    if (existingRows.length === 0) {
        throw new Errors_1.NotFound("Lead not found");
    }
    const existingLead = existingRows[0].lead;
    const existingLeaderId = existingRows[0].leader_id;
    if (((role && (0, helpers_1.isLeader)(role)) || role === "leader_sales") && existingLeaderId !== userId) {
        throw new Errors_1.NotFound("Lead not found or unauthorized");
    }
    if (role === "sales" && existingLead.sales_id !== userId) {
        throw new Errors_1.NotFound("Lead not found or unauthorized");
    }
    await db_1.db.delete(schema_1.leads).where((0, helpers_1.getProjectId)(req) ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.leads.id, id), (0, drizzle_orm_1.eq)(schema_1.leads.sales_project_id, (0, helpers_1.getProjectId)(req))) : (0, drizzle_orm_1.eq)(schema_1.leads.id, id));
    (0, response_1.SuccessResponse)(res, { message: "Lead deleted successfully" }, 200);
};
exports.deleteLead = deleteLead;
// ✅ Convert Lead to Visit (copies lead fields to visits and deletes from leads)
const convertLeadToVisit = async (req, res) => {
    const validated = await exports.convertLeadSchema.parseAsync({
        params: req.params,
        body: req.body || {},
    });
    const { id } = validated.params;
    const { status_id } = validated.body;
    const role = req.user?.role;
    const userId = req.user?.id;
    const existingRows = await db_1.db
        .select({
        lead: schema_1.leads,
        leader_id: schema_1.users.leader_id,
    })
        .from(schema_1.leads)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.leads.sales_id, schema_1.users.id))
        .where((0, drizzle_orm_1.eq)(schema_1.leads.id, id))
        .limit(1);
    if (existingRows.length === 0) {
        throw new Errors_1.NotFound("Lead not found");
    }
    const lead = existingRows[0].lead;
    const existingLeaderId = existingRows[0].leader_id;
    if (((role && (0, helpers_1.isLeader)(role)) || role === "leader_sales") && existingLeaderId !== userId) {
        throw new Errors_1.NotFound("Lead not found or unauthorized");
    }
    if (role === "sales" && lead.sales_id !== userId) {
        throw new Errors_1.NotFound("Lead not found or unauthorized");
    }
    const statusRecord = await db_1.db
        .select({ id: schema_1.visitStatus.id })
        .from(schema_1.visitStatus)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.visitStatus.id, status_id), (0, drizzle_orm_1.eq)(schema_1.visitStatus.status, true)))
        .limit(1);
    if (statusRecord.length === 0) {
        throw new BadRequest_1.BadRequest("Invalid or inactive status_id");
    }
    const leadProducts = (0, visits_1.parseProductsArray)(validated.body?.products !== undefined
        ? validated.body.products
        : lead.products);
    await db_1.db.transaction(async (tx) => {
        await tx.insert(schema_1.visits).values({
            id: crypto.randomUUID(),
            lat: lead.lat,
            lng: lead.lng,
            name: lead.name,
            phone: lead.phone,
            sales_id: lead.sales_id,
            sales_project_id: lead.sales_project_id,
            owner_name: lead.place_name || null,
            owner_phone: lead.place_phone || null,
            address: lead.address,
            notes: lead.notes || null,
            status_id,
            points: 0,
            status: "visit",
            products: leadProducts,
        });
        await tx.delete(schema_1.leads).where((0, helpers_1.getProjectId)(req) ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.leads.id, id), (0, drizzle_orm_1.eq)(schema_1.leads.sales_project_id, (0, helpers_1.getProjectId)(req))) : (0, drizzle_orm_1.eq)(schema_1.leads.id, id));
    });
    (0, response_1.SuccessResponse)(res, { message: "Lead converted to visit successfully" }, 200);
};
exports.convertLeadToVisit = convertLeadToVisit;
