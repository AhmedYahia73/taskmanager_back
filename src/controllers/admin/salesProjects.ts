import { Request, Response } from "express";
import { salesDb } from "../../models/sales/db";
import { salesProjects } from "../../models/sales/schema";
import { desc, like, count, eq } from "drizzle-orm";
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
  }),
});

export const salesProjectIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }),
  }),
});

// ==========================================
// 🎮 Controllers (Operating on Sales DB)
// ==========================================

// ✅ Get All Sales Projects (With Search & Pagination)
export const getAllSalesProjects = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const search = (req.query.search as string) || "";
  const offset = (page - 1) * limit;

  let query = salesDb
    .select()
    .from(salesProjects)
    .orderBy(desc(salesProjects.createdAt))
    .$dynamic();

  let countQuery = salesDb
    .select({ total: count() })
    .from(salesProjects)
    .$dynamic();

  if (search) {
    query = query.where(like(salesProjects.name, `%${search}%`));
    countQuery = countQuery.where(like(salesProjects.name, `%${search}%`));
  }

  const [allSalesProjects, [{ total: totalCount }]] = await Promise.all([
    query.limit(limit).offset(offset),
    countQuery,
  ]);

  SuccessResponse(
    res,
    {
      salesProjects: allSalesProjects,
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

  const result = await salesDb
    .select()
    .from(salesProjects)
    .where(eq(salesProjects.id, id))
    .limit(1);

  if (!result[0]) {
    throw new NotFound("Sales project not found");
  }

  SuccessResponse(res, { salesProject: result[0] }, 200);
};

// ✅ Create Sales Project
export const createSalesProject = async (req: Request, res: Response) => {
  const validated = await createSalesProjectSchema.parseAsync({ body: req.body });
  const { name, logo, design } = validated.body;

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

  const created = await salesDb
    .select()
    .from(salesProjects)
    .where(eq(salesProjects.id, id))
    .limit(1);

  SuccessResponse(
    res,
    {
      message: "Sales project created successfully",
      salesProject: created[0],
    },
    201
  );
};

// ✅ Update Sales Project
export const updateSalesProject = async (req: Request, res: Response) => {
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

  const updated = await salesDb
    .select()
    .from(salesProjects)
    .where(eq(salesProjects.id, id))
    .limit(1);

  SuccessResponse(
    res,
    {
      message: "Sales project updated successfully",
      salesProject: updated[0],
    },
    200
  );
};

// ✅ Delete Sales Project
export const deleteSalesProject = async (req: Request, res: Response) => {
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

  await salesDb.delete(salesProjects).where(eq(salesProjects.id, id));

  SuccessResponse(res, { message: "Sales project deleted successfully" }, 200);
};

// ✅ Generate SSO Access Token for Sales Dashboard (Admin / Leader)
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

  let role: "admin" | "leader" | "sales" = "admin";
  if (currentUser.role === "leader") {
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

  const targetBaseUrl = frontDomain.startsWith("http://") || frontDomain.startsWith("https://")
    ? frontDomain.replace(/\/+$/, "")
    : `https://${frontDomain.replace(/\/+$/, "")}`;

  const redirectUrl = `${targetBaseUrl}/home?token=${token}`;

  SuccessResponse(
    res,
    {
      token,
      role,
      project_id: id,
      redirectUrl,
    },
    200
  );
};
