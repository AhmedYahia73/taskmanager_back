import { Request, Response } from "express";
import { db } from "../../models/db";
import { salesProjects } from "../../models/schema";
import { desc, like, count, eq } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { BadRequest } from "../../Errors/BadRequest";
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
  }),
});

export const updateSalesProjectSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }),
  }),
  body: z.object({
    name: z.string().min(1, "Name cannot be empty").max(200).optional(),
    logo: z.any().optional(),
  }),
});

export const salesProjectIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }),
  }),
});

// ==========================================
// 🎮 Controllers
// ==========================================

// ✅ Get All Sales Projects (With Search & Pagination)
export const getAllSalesProjects = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const search = (req.query.search as string) || "";
  const offset = (page - 1) * limit;

  let query = db
    .select()
    .from(salesProjects)
    .orderBy(desc(salesProjects.createdAt))
    .$dynamic();

  let countQuery = db
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

  const result = await db
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
  const { name, logo } = validated.body;

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
  await db.insert(salesProjects).values({
    id,
    name,
    logo: savedLogo,
  });

  const created = await db
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
  const { name, logo } = validated.body;

  const existing = await db
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

  if (Object.keys(updateData).length > 0) {
    await db.update(salesProjects).set(updateData).where(eq(salesProjects.id, id));
  }

  const updated = await db
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

  const existing = await db
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

  await db.delete(salesProjects).where(eq(salesProjects.id, id));

  SuccessResponse(res, { message: "Sales project deleted successfully" }, 200);
};
