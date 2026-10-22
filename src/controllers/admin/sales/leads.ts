import { getProjectId, isLeader, isAdminRole, isSales } from "./helpers";
import { Request, Response } from "express";
import { db } from "../../../models/db";
import { leads, visits, users, products, visitStatus } from "../../../models/schema";
import { eq, and, or } from "drizzle-orm";
import { BadRequest } from "../../../Errors/BadRequest";
import { NotFound } from "../../../Errors";
import { SuccessResponse } from "../../../utils/response";
import { z } from "zod";
import {
  parseProductsArray,
  enrichRecordsWithProducts,
  VisitProductItem,
} from "./visits";

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================

const leadProductItemSchema = z.object({
  product_id: z
    .string({ required_error: "Product ID is required" })
    .min(1, "Product ID cannot be empty"),
  duration: z.string().optional().default(""),
});

export const createLeadSchema = (userRole?: string) =>
  z.object({
    body: z.object({
      name: z
        .string({ required_error: "Name is required" })
        .min(1, "Name cannot be empty")
        .max(255, "Name cannot exceed 255 characters"),
      phone: z
        .string({ required_error: "Phone is required" })
        .min(5, "Phone number is too short")
        .max(20, "Phone cannot exceed 20 characters"),
      sales_id:
        userRole === "sales"
          ? z.string().uuid("Invalid Sales ID format").optional()
          : z
              .string({ required_error: "Sales ID is required" })
              .uuid("Invalid Sales ID format"),
      place_name: z.string().max(255).nullable().optional(),
      place_phone: z.string().max(20).nullable().optional(),
      lat: z.coerce
        .number({ required_error: "Latitude (lat) is required" })
        .min(-90)
        .max(90),
      lng: z.coerce
        .number({ required_error: "Longitude (lng) is required" })
        .min(-180)
        .max(180),
      address: z
        .string({ required_error: "Address is required" })
        .min(1, "Address cannot be empty")
        .max(500, "Address cannot exceed 500 characters"),
      notes: z.string().max(1000).nullable().optional(),
      products: z.array(leadProductItemSchema).nullable().optional(),
      product_id: z.string().nullable().optional(),
      duration: z.string().nullable().optional(),
    }),
  });

export const updateLeadSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "Lead ID is required" }),
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    phone: z.string().min(5).max(20).optional(),
    sales_id: z.string().uuid("Invalid Sales ID format").optional(),
    place_name: z.string().max(255).nullable().optional(),
    place_phone: z.string().max(20).nullable().optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    address: z.string().min(1).max(500).optional(),
    notes: z.string().max(1000).nullable().optional(),
    products: z.array(leadProductItemSchema).nullable().optional(),
    product_id: z.string().nullable().optional(),
    duration: z.string().nullable().optional(),
  }),
});

export const leadIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "Lead ID is required" }),
  }),
});

export const convertLeadSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "Lead ID is required" }),
  }),
  body: z.object({
    status_id: z
      .string({ required_error: "Status ID is required" })
      .min(1, "Status ID cannot be empty"),
    products: z.array(leadProductItemSchema).optional(),
  }),
});

const validateProductsInput = async (
  rawProducts: any
): Promise<VisitProductItem[]> => {
  const items = parseProductsArray(rawProducts);
  for (const item of items) {
    const productExists = await db
      .select()
      .from(products)
      .where(eq(products.id, item.product_id))
      .limit(1);

    if (productExists.length === 0) {
      throw new BadRequest(`Invalid product_id: ${item.product_id}`);
    }
  }
  return items;
};

// ==========================================
// 🎮 Controllers
// ==========================================

// ✅ Get all Leads (filtered by role: admin -> all, leader -> where sales.leader_id = my id, sales -> where sales_id = my id)
export const getAllLeads = async (req: Request, res: Response) => {
  const role = req.user?.role;
  const userId = req.user?.id;

  let baseCondition: any = undefined;
  if (isLeader(role) && userId) {
    baseCondition = or(eq(users.leader_id, userId), eq(leads.sales_id, userId));
  } else if (isSales(role) && userId) {
    baseCondition = eq(leads.sales_id, userId);
  }

  const allLeads = await db
    .select({
      id: leads.id,
      name: leads.name,
      phone: leads.phone,
      sales_id: leads.sales_id,
      sales: users.name,
      sales_phone: users.phone,
      leader_id: users.leader_id,
      place_name: leads.place_name,
      place_phone: leads.place_phone,
      lat: leads.lat,
      lng: leads.lng,
      address: leads.address,
      notes: leads.notes,
      products: leads.products,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
    })
    .from(leads)
    .leftJoin(users, eq(leads.sales_id, users.id))
    .where(baseCondition);

  const enriched = await enrichRecordsWithProducts(allLeads);

  const leadsWithLinks = enriched.map((l) => ({
    ...l,
    map_link: `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`,
  }));

  SuccessResponse(
    res,
    { allLeads: leadsWithLinks, leads: leadsWithLinks },
    200
  );
};

// ✅ Lists for Leads (sales list based on role + products list)
export const lists = async (req: Request, res: Response) => {
  const role = req.user?.role;
  const userId = req.user?.id;

  let salesList: { id: string; name: string }[] = [];

  if (isLeader(role) && userId) {
    salesList = await db
      .select({
        id: users.id,
        name: users.name,
      })
      .from(users)
      .where(
        or(
          and(eq(users.role, "sales"), eq(users.leader_id, userId)),
          eq(users.id, userId)
        )
      );
  } else {
    salesList = await db
      .select({
        id: users.id,
        name: users.name,
      })
      .from(users)
      .where(or(eq(users.role, "sales"), eq(users.role, "leader_sales")));
  }

  const [allProducts, rawVisitStatus] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        points: products.points,
      })
      .from(products),
    db
      .select({
        id: visitStatus.id,
        name: visitStatus.name,
      })
      .from(visitStatus)
      .where(eq(visitStatus.status, true)),
  ]);

  const healedVisitStatus = [];
  for (const st of rawVisitStatus) {
    if (!st.id || st.id.trim() === "") {
      const generatedId = crypto.randomUUID();
      await db.update(visitStatus).set({ id: generatedId }).where(eq(visitStatus.name, st.name)).catch(() => {});
      healedVisitStatus.push({ ...st, id: generatedId });
    } else {
      healedVisitStatus.push(st);
    }
  }

  SuccessResponse(res, { sales: salesList, products: allProducts, visit_status: healedVisitStatus }, 200);
};

// ✅ Get Lead by ID (with role check)
export const getLeadById = async (req: Request, res: Response) => {
  const validated = await leadIdSchema.parseAsync({ params: req.params });
  const { id } = validated.params;

  const role = req.user?.role;
  const userId = req.user?.id;

  const conditions: any[] = [eq(leads.id, id)];
  if (isLeader(role) && userId) {
    conditions.push(or(eq(users.leader_id, userId), eq(leads.sales_id, userId)));
  } else if (isSales(role) && userId) {
    conditions.push(eq(leads.sales_id, userId));
  }

  const rows = await db
    .select({
      id: leads.id,
      name: leads.name,
      phone: leads.phone,
      sales_id: leads.sales_id,
      sales: users.name,
      sales_phone: users.phone,
      leader_id: users.leader_id,
      place_name: leads.place_name,
      place_phone: leads.place_phone,
      lat: leads.lat,
      lng: leads.lng,
      address: leads.address,
      notes: leads.notes,
      products: leads.products,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
    })
    .from(leads)
    .leftJoin(users, eq(leads.sales_id, users.id))
    .where(and(...conditions))
    .limit(1);

  if (rows.length === 0) throw new NotFound("Lead not found");

  const enriched = await enrichRecordsWithProducts(rows);
  const lead = enriched[0];

  const leadWithMap = {
    ...lead,
    map_link: `https://www.google.com/maps/search/?api=1&query=${lead.lat},${lead.lng}`,
  };

  SuccessResponse(res, { Lead: leadWithMap, lead: leadWithMap }, 200);
};

// ✅ Create Lead
export const createLead = async (req: Request, res: Response) => {
  const role = req.user?.role;
  const userId = req.user?.id;

  const validated = await createLeadSchema(role).parseAsync({ body: req.body });
  const {
    name,
    phone,
    sales_id: bodySalesId,
    place_name,
    place_phone,
    lat,
    lng,
    address,
    notes,
    products: bodyProducts,
    product_id,
    duration,
  } = validated.body;

  let finalSalesId: string | undefined;

  if (isSales(role)) {
    finalSalesId = userId;
  } else {
    finalSalesId = bodySalesId;
  }

  if (!finalSalesId) {
    throw new BadRequest("sales_id is required");
  }

  // Validate sales user exists and matches leader scope if leader
  const salesUser = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, finalSalesId),
        or(
          eq(users.role, "sales"),
          eq(users.role, "leader_sales")
        )
      )
    )
    .limit(1);

  if (salesUser.length === 0) {
    throw new BadRequest("Invalid sales_id — user not found or not a sales user");
  }

  const isCurrentLeader = (role && isLeader(role)) || role === "leader_sales" || role === "leader";
  if (isCurrentLeader && salesUser[0].id !== userId && salesUser[0].leader_id !== userId) {
    throw new BadRequest("You can only assign leads to yourself or sales users under your team");
  }

  const rawProductsInput =
    bodyProducts !== undefined
      ? bodyProducts
      : product_id
      ? [{ product_id, duration: duration || "" }]
      : [];

  const validatedProducts = await validateProductsInput(rawProductsInput);

  const projectId = getProjectId(req);
  const newLeadId = crypto.randomUUID();
  await db.insert(leads).values({
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

  SuccessResponse(res, { message: "Lead created successfully" }, 201);
};

// ✅ Update Lead
export const updateLead = async (req: Request, res: Response) => {
  const validated = await updateLeadSchema.parseAsync({
    params: req.params,
    body: req.body,
  });
  const { id } = validated.params;

  const role = req.user?.role;
  const userId = req.user?.id;

  // Verify lead exists and user has permission
  const existingRows = await db
    .select({
      lead: leads,
      leader_id: users.leader_id,
    })
    .from(leads)
    .leftJoin(users, eq(leads.sales_id, users.id))
    .where(eq(leads.id, id))
    .limit(1);

  if (existingRows.length === 0) {
    throw new NotFound("Lead not found");
  }

  const existingLead = existingRows[0].lead;
  const existingLeaderId = existingRows[0].leader_id;

  if (((role && isLeader(role)) || role === "leader_sales" || role === "leader") && existingLead.sales_id !== userId && existingLeaderId !== userId) {
    throw new NotFound("Lead not found or unauthorized");
  }
  if (role === "sales" && existingLead.sales_id !== userId) {
    throw new NotFound("Lead not found or unauthorized");
  }

  const {
    name,
    phone,
    sales_id: bodySalesId,
    place_name,
    place_phone,
    lat,
    lng,
    address,
    notes,
    products: bodyProducts,
    product_id,
    duration,
  } = validated.body;

  let finalSalesId: string | undefined = undefined;
  if (isSales(role)) {
    finalSalesId = userId;
  } else if (bodySalesId !== undefined) {
    const salesUser = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, bodySalesId),
          or(
            eq(users.role, "sales"),
            eq(users.role, "leader_sales")
          )
        )
      )
      .limit(1);

    if (salesUser.length === 0) {
      throw new BadRequest("Invalid sales_id — user not found or not a sales user");
    }

    const isCurrentLeader = (role && isLeader(role)) || role === "leader_sales" || role === "leader";
    if (isCurrentLeader && salesUser[0].id !== userId && salesUser[0].leader_id !== userId) {
      throw new BadRequest("You can only assign leads to yourself or sales users under your team");
    }

    finalSalesId = bodySalesId;
  }

  let validatedProducts: VisitProductItem[] | undefined = undefined;
  if (bodyProducts !== undefined) {
    validatedProducts = await validateProductsInput(bodyProducts);
  } else if (product_id !== undefined) {
    validatedProducts = await validateProductsInput(
      product_id ? [{ product_id, duration: duration || "" }] : []
    );
  }

  const updateData: any = {
    name: name ?? existingLead.name,
    phone: phone ?? existingLead.phone,
    sales_id: finalSalesId ?? existingLead.sales_id,
    place_name: place_name !== undefined ? place_name : existingLead.place_name,
    place_phone: place_phone !== undefined ? place_phone : existingLead.place_phone,
    lat: lat !== undefined ? Number(lat) : existingLead.lat,
    lng: lng !== undefined ? Number(lng) : existingLead.lng,
    address: address ?? existingLead.address,
    notes: notes !== undefined ? notes : existingLead.notes,
    products:
      validatedProducts !== undefined ? validatedProducts : existingLead.products,
  };

  await db.update(leads).set(updateData).where(getProjectId(req) ? and(eq(leads.id, id), eq(leads.sales_project_id, getProjectId(req)!)) : eq(leads.id, id));

  SuccessResponse(res, { message: "Lead updated successfully" }, 200);
};

// ✅ Delete Lead
export const deleteLead = async (req: Request, res: Response) => {
  const validated = await leadIdSchema.parseAsync({ params: req.params });
  const { id } = validated.params;

  const role = req.user?.role;
  const userId = req.user?.id;

  const existingRows = await db
    .select({
      lead: leads,
      leader_id: users.leader_id,
    })
    .from(leads)
    .leftJoin(users, eq(leads.sales_id, users.id))
    .where(eq(leads.id, id))
    .limit(1);

  if (existingRows.length === 0) {
    throw new NotFound("Lead not found");
  }

  const existingLead = existingRows[0].lead;
  const existingLeaderId = existingRows[0].leader_id;

  if (((role && isLeader(role)) || role === "leader_sales" || role === "leader") && existingLead.sales_id !== userId && existingLeaderId !== userId) {
    throw new NotFound("Lead not found or unauthorized");
  }
  if (role === "sales" && existingLead.sales_id !== userId) {
    throw new NotFound("Lead not found or unauthorized");
  }

  await db.delete(leads).where(getProjectId(req) ? and(eq(leads.id, id), eq(leads.sales_project_id, getProjectId(req)!)) : eq(leads.id, id));

  SuccessResponse(res, { message: "Lead deleted successfully" }, 200);
};

// ✅ Convert Lead to Visit (copies lead fields to visits and deletes from leads)
export const convertLeadToVisit = async (req: Request, res: Response) => {
  const validated = await convertLeadSchema.parseAsync({
    params: req.params,
    body: req.body || {},
  });
  const { id } = validated.params;
  const { status_id } = validated.body;

  const role = req.user?.role;
  const userId = req.user?.id;

  const existingRows = await db
    .select({
      lead: leads,
      leader_id: users.leader_id,
    })
    .from(leads)
    .leftJoin(users, eq(leads.sales_id, users.id))
    .where(eq(leads.id, id))
    .limit(1);

  if (existingRows.length === 0) {
    throw new NotFound("Lead not found");
  }

  const lead = existingRows[0].lead;
  const existingLeaderId = existingRows[0].leader_id;

  if (((role && isLeader(role)) || role === "leader_sales" || role === "leader") && lead.sales_id !== userId && existingLeaderId !== userId) {
    throw new NotFound("Lead not found or unauthorized");
  }
  if (isSales(role) && lead.sales_id !== userId) {
    throw new NotFound("Lead not found or unauthorized");
  }

  const statusRecord = await db
    .select({ id: visitStatus.id })
    .from(visitStatus)
    .where(and(eq(visitStatus.id, status_id), eq(visitStatus.status, true)))
    .limit(1);

  if (statusRecord.length === 0) {
    throw new BadRequest("Invalid or inactive status_id");
  }

  const leadProducts = parseProductsArray(
    validated.body?.products !== undefined
      ? validated.body.products
      : lead.products
  );

  await db.transaction(async (tx) => {
    await tx.insert(visits).values({
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

    await tx.delete(leads).where(getProjectId(req) ? and(eq(leads.id, id), eq(leads.sales_project_id, getProjectId(req)!)) : eq(leads.id, id));
  });

  SuccessResponse(
    res,
    { message: "Lead converted to visit successfully" },
    200
  );
};

