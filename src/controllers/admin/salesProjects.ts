import { Request, Response } from "express";
import { db } from "../../models/db";
import { users } from "../../models/schema";
import { salesDb } from "../../models/sales/db";
import { salesProjects, salesProjectUsers } from "../../models/sales/schema";
import { desc, like, count, eq, inArray, and, or } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { BadRequest } from "../../Errors/BadRequest";
import { UnauthorizedError } from "../../Errors";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { getFileUrl } from "../../middlewares/upload";
import { saveBase64Image } from "../../utils/handleImages";
import { deletePhotoFromServer } from "../../utils/deleteImage";

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
export const createSalesProjectSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Name is required" })
      .min(1, "Name cannot be empty")
      .max(200, "Name cannot exceed 200 characters"),
    logo: z.any().optional(),
    design: z.enum(["design 1", "design 2"]).optional().default("design 1"),
    user_ids: z.any().optional(),
  }),
});

export const updateSalesProjectSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }),
  }),
  body: z.object({
    name: z.string().min(1, "Name cannot be empty").max(200).optional(),
    logo: z.any().optional(),
    design: z.enum(["design 1", "design 2"]).optional(),
    user_ids: z.any().optional(),
  }),
});

export const salesProjectIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }),
  }),
});

// Helper to parse user_ids from body (handles JSON string, array, or comma-separated)
const parseUserIds = (raw: any): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
};

// ==========================================
// 🎮 Controllers (Operating on Sales DB)
// ==========================================

// ✅ Get Available Users (Leaders & Sales) for Project Assignment
export const getAvailableSalesUsers = async (req: Request, res: Response) => {
  const availableUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      image: users.image,
    })
    .from(users)
    .where(or(eq(users.role, "leader_sales"), eq(users.role, "sales")));

  SuccessResponse(res, { users: availableUsers }, 200);
};

// ✅ Get All Sales Projects (With Search & Pagination)
export const getAllSalesProjects = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const search = (req.query.search as string) || "";
  const offset = (page - 1) * limit;
  const currentUser = req.user;

  let query = salesDb
    .select()
    .from(salesProjects)
    .orderBy(desc(salesProjects.createdAt))
    .$dynamic();

  let countQuery = salesDb
    .select({ total: count() })
    .from(salesProjects)
    .$dynamic();

  // If user is sales or leader, filter ONLY to their assigned projects from sales_project_users
  if (currentUser?.role === "sales" || currentUser?.role === "leader_sales") {
    const assigned = await salesDb
      .select({ sales_project_id: salesProjectUsers.sales_project_id })
      .from(salesProjectUsers)
      .where(eq(salesProjectUsers.user_id, currentUser.id));

    const assignedIds = Array.from(new Set(assigned.map((a) => a.sales_project_id).filter(Boolean)));

    if (assignedIds.length === 0) {
      return SuccessResponse(
        res,
        {
          salesProjects: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        },
        200
      );
    }

    query = query.where(inArray(salesProjects.id as any, assignedIds));
    countQuery = countQuery.where(inArray(salesProjects.id as any, assignedIds));
  }

  if (search) {
    query = query.where(like(salesProjects.name, `%${search}%`));
    countQuery = countQuery.where(like(salesProjects.name, `%${search}%`));
  }

  const [allSalesProjects, [{ total: totalCount }]] = await Promise.all([
    query.limit(limit).offset(offset),
    countQuery,
  ]);

  // Fetch assigned users for each project
  const projectIds = allSalesProjects.map((p) => p.id);
  const projectUsersMap: Record<string, string[]> = {};

  if (projectIds.length > 0) {
    const pUsers = await salesDb
      .select({
        sales_project_id: salesProjectUsers.sales_project_id,
        user_id: salesProjectUsers.user_id,
      })
      .from(salesProjectUsers)
      .where(inArray(salesProjectUsers.sales_project_id as any, projectIds));

    for (const pu of pUsers) {
      if (pu.sales_project_id) {
        if (!projectUsersMap[pu.sales_project_id]) {
          projectUsersMap[pu.sales_project_id] = [];
        }
        projectUsersMap[pu.sales_project_id].push(pu.user_id);
      }
    }
  }

  const enriched = allSalesProjects.map((p) => ({
    ...p,
    user_ids: projectUsersMap[p.id] || [],
    members_count: (projectUsersMap[p.id] || []).length,
  }));

  SuccessResponse(
    res,
    {
      salesProjects: enriched,
      pagination: {
        total: Number(totalCount),
        page,
        limit,
        totalPages: Math.ceil(Number(totalCount) / limit),
      },
    },
    200
  );
};

// ✅ Get Sales Project By ID
export const getSalesProjectById = async (req: Request, res: Response) => {
  const validated = await salesProjectIdSchema.parseAsync({ params: req.params });
  const { id } = validated.params;
  const currentUser = req.user;

  // If sales or leader, make sure they belong to this project
  if (currentUser?.role === "sales" || currentUser?.role === "leader_sales") {
    const userInProj = await salesDb
      .select({ id: salesProjectUsers.id })
      .from(salesProjectUsers)
      .where(and(eq(salesProjectUsers.sales_project_id, id), eq(salesProjectUsers.user_id, currentUser.id)))
      .limit(1);

    if (!userInProj[0]) {
      throw new UnauthorizedError("You do not have access to this sales project");
    }
  }

  const result = await salesDb
    .select()
    .from(salesProjects)
    .where(eq(salesProjects.id, id))
    .limit(1);

  if (!result[0]) {
    throw new NotFound("Sales project not found");
  }

  const assigned = await salesDb
    .select({ user_id: salesProjectUsers.user_id })
    .from(salesProjectUsers)
    .where(eq(salesProjectUsers.sales_project_id, id));

  SuccessResponse(
    res,
    {
      salesProject: {
        ...result[0],
        user_ids: assigned.map((a) => a.user_id),
      },
    },
    200
  );
};

// ✅ Create Sales Project (Admin only)
export const createSalesProject = async (req: Request, res: Response) => {
  if (req.user?.role !== "admin" && req.user?.role !== "super_admin") {
    throw new UnauthorizedError("Only admins can create sales projects");
  }

  const validated = await createSalesProjectSchema.parseAsync({ body: req.body });
  const { name, logo, design } = validated.body;
  const userIds = parseUserIds(req.body.user_ids);

  let savedLogo: string | null = null;

  if (req.file) {
    savedLogo = getFileUrl(req, req.file, "salesProjects");
  } else if (logo && typeof logo === "string" && logo.startsWith("data:")) {
    const result = await saveBase64Image(req, logo, "salesProjects");
    savedLogo = result.url;
  } else if (
    typeof logo === "string" &&
    logo.trim() !== "" &&
    logo !== "null" &&
    logo !== "undefined"
  ) {
    savedLogo = logo.trim();
  }

  if (!savedLogo) {
    throw new BadRequest("Logo is required");
  }

  const id = uuidv4();
  await salesDb.insert(salesProjects).values({
    id,
    name,
    logo: savedLogo,
    design: design || "design 1",
  });

  // Assign users to project in sales_project_users
  if (userIds.length > 0) {
    const userRows = userIds.map((userId) => ({
      id: uuidv4(),
      sales_project_id: id,
      user_id: userId,
    }));
    await salesDb.insert(salesProjectUsers).values(userRows);
  }

  const created = await salesDb
    .select()
    .from(salesProjects)
    .where(eq(salesProjects.id, id))
    .limit(1);

  SuccessResponse(
    res,
    {
      message: "Sales project created successfully",
      salesProject: {
        ...created[0],
        user_ids: userIds,
      },
    },
    201
  );
};

// ✅ Update Sales Project (Admin only)
export const updateSalesProject = async (req: Request, res: Response) => {
  if (req.user?.role !== "admin" && req.user?.role !== "super_admin") {
    throw new UnauthorizedError("Only admins can update sales projects");
  }

  const validated = await updateSalesProjectSchema.parseAsync({
    params: req.params,
    body: req.body,
  });
  const { id } = validated.params;
  const { name, logo, design } = validated.body;

  const existing = await salesDb
    .select()
    .from(salesProjects)
    .where(eq(salesProjects.id, id))
    .limit(1);

  if (!existing[0]) {
    throw new NotFound("Sales project not found");
  }

  let finalLogo = existing[0].logo;

  if (req.file) {
    finalLogo = getFileUrl(req, req.file, "salesProjects");
    if (existing[0].logo) {
      await deletePhotoFromServer(existing[0].logo);
    }
  } else if (logo && typeof logo === "string" && logo.startsWith("data:")) {
    const result = await saveBase64Image(req, logo, "salesProjects");
    finalLogo = result.url;
    if (existing[0].logo) {
      await deletePhotoFromServer(existing[0].logo);
    }
  } else if (
    typeof logo === "string" &&
    logo.trim() !== "" &&
    logo !== "null" &&
    logo !== "undefined" &&
    logo !== existing[0].logo
  ) {
    finalLogo = logo.trim();
  }

  if (!finalLogo || finalLogo.trim() === "") {
    throw new BadRequest("Logo is required and cannot be empty");
  }

  const updateData: Record<string, any> = {};
  if (name !== undefined) updateData.name = name;
  if (finalLogo !== undefined) updateData.logo = finalLogo;
  if (design !== undefined) updateData.design = design;

  if (Object.keys(updateData).length > 0) {
    await salesDb.update(salesProjects).set(updateData).where(eq(salesProjects.id, id));
  }

  // Update assigned users if passed
  if (req.body.user_ids !== undefined) {
    const userIds = parseUserIds(req.body.user_ids);
    await salesDb.delete(salesProjectUsers).where(eq(salesProjectUsers.sales_project_id, id));
    if (userIds.length > 0) {
      const userRows = userIds.map((userId) => ({
        id: uuidv4(),
        sales_project_id: id,
        user_id: userId,
      }));
      await salesDb.insert(salesProjectUsers).values(userRows);
    }
  }

  const updated = await salesDb
    .select()
    .from(salesProjects)
    .where(eq(salesProjects.id, id))
    .limit(1);

  const assigned = await salesDb
    .select({ user_id: salesProjectUsers.user_id })
    .from(salesProjectUsers)
    .where(eq(salesProjectUsers.sales_project_id, id));

  SuccessResponse(
    res,
    {
      message: "Sales project updated successfully",
      salesProject: {
        ...updated[0],
        user_ids: assigned.map((a) => a.user_id),
      },
    },
    200
  );
};

// ✅ Delete Sales Project (Admin only)
export const deleteSalesProject = async (req: Request, res: Response) => {
  if (req.user?.role !== "admin" && req.user?.role !== "super_admin") {
    throw new UnauthorizedError("Only admins can delete sales projects");
  }

  const validated = await salesProjectIdSchema.parseAsync({ params: req.params });
  const { id } = validated.params;

  const existing = await salesDb
    .select()
    .from(salesProjects)
    .where(eq(salesProjects.id, id))
    .limit(1);

  if (!existing[0]) {
    throw new NotFound("Sales project not found");
  }

  if (existing[0].logo) {
    await deletePhotoFromServer(existing[0].logo);
  }

  // Delete project users association
  await salesDb.delete(salesProjectUsers).where(eq(salesProjectUsers.sales_project_id, id));
  await salesDb.delete(salesProjects).where(eq(salesProjects.id, id));

  SuccessResponse(res, { message: "Sales project deleted successfully" }, 200);
};

// ✅ Generate SSO Access Token for Sales Dashboard (Admin / Leader / Sales)
export const getProjectAccessToken = async (req: Request, res: Response) => {
  const { id } = req.params;
  const currentUser = req.user;

  if (!currentUser) {
    throw new UnauthorizedError("Authentication required");
  }

  const [project] = await salesDb
    .select()
    .from(salesProjects)
    .where(eq(salesProjects.id, id))
    .limit(1);

  if (!project) {
    throw new NotFound("Sales project not found");
  }

  // If user is sales or leader, check they are actually assigned to this project
  if (currentUser.role === "sales" || currentUser.role === "leader_sales") {
    const [membership] = await salesDb
      .select()
      .from(salesProjectUsers)
      .where(
        and(
          eq(salesProjectUsers.sales_project_id, id),
          eq(salesProjectUsers.user_id, currentUser.id)
        )
      )
      .limit(1);

    if (!membership) {
      throw new UnauthorizedError("You are not assigned to this sales project");
    }
  }

  let role: "admin" | "leader" | "sales" = "admin";
  if (currentUser.role === "leader_sales") {
    role = "leader";
  } else if (currentUser.role === "sales") {
    role = "sales";
  }

  const payload = {
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email || "",
    phone: currentUser.phone || "",
    role: role,
    project_id: id,
    project_name: project.name,
    project_logo: project.logo,
    project_design: project.design,
  };

  const JWT_SECRET = process.env.JWT_SECRET as string;
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

  let frontDomain = process.env.FRONT_ADMIN;
  if (role === "leader") {
    frontDomain = process.env.LEADER_ADMIN || "https://leadersales.wegostation.com";
  } else if (role === "sales") {
    frontDomain = process.env.SALES_ADMIN || "https://mainsales.wegostation.com";
  } else {
    frontDomain = process.env.FRONT_ADMIN || "https://adminsales.wegostation.com";
  }

  // Clean trailing slashes
  frontDomain = frontDomain.replace(/\/+$/, "");

  const redirectUrl = `${frontDomain}/home?token=${encodeURIComponent(token)}`;

  SuccessResponse(
    res,
    {
      token,
      redirectUrl,
      project: {
        id: project.id,
        name: project.name,
        logo: project.logo,
        design: project.design,
        role,
      },
    },
    200
  );
};
