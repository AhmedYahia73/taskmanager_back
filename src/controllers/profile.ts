import { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { eq, and, ne, sql } from "drizzle-orm";
import { db } from "../models/db";
import { users, departments, jobs, zones, shifts } from "../models/schema";
import { BadRequest, NotFound, UnauthorizedError } from "../Errors";
import { SuccessResponse } from "../utils/response";
import { deletePhotoFromServer } from "../utils/deleteImage";
import { saveBase64Image } from "../utils/handleImages";
import { getFileUrl } from "../middlewares/upload";
import { generateUserToken } from "../utils/auth";

// Validation schema for profile update
export const updateProfileSchema = z.object({
  body: z.object({
    name: z.preprocess(
      (val) => (typeof val === "string" ? val.trim() : val),
      z.string().min(1, "Name cannot be empty").max(200, "Name cannot exceed 200 characters").optional()
    ),
    email: z.preprocess(
      (val) => (typeof val === "string" ? val.trim().toLowerCase() : val),
      z.string().email("Invalid email format").max(100, "Email cannot exceed 100 characters").optional()
    ),
    phone: z.preprocess(
      (val) => (typeof val === "string" ? val.trim() : val),
      z.string().min(5, "Phone is too short").max(20, "Phone cannot exceed 20 characters").optional()
    ),
    whatsapp: z.preprocess(
      (val) => (val === "" || val === "null" || val === "undefined" ? null : typeof val === "string" ? val.trim() : val),
      z.string().max(20, "WhatsApp number cannot exceed 20 characters").optional().nullable()
    ),
    password: z.preprocess(
      (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
      z.string().min(7, "Password must be at least 7 characters").max(255).optional().nullable()
    ),
    image: z.any().nullable().optional(),
  }),
});

// ✅ Get Current User Profile
export const getProfile = async (req: Request, res: Response) => {
  const currentUserId = req.user?.id;
  if (!currentUserId) {
    throw new UnauthorizedError("Authentication required");
  }

  const userRecord = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      whatsapp: users.whatsapp,
      image: users.image,
      role: users.role,
      status: users.status,
      points: users.points,
      yearly_holidays: users.yearly_holidays,
      zone_id: users.zone_id,
      zone_name: zones.name,
      shift_id: users.shift_id,
      shift_name: shifts.name,
      department_id: users.department_id,
      department_name: departments.name,
      job_id: users.job_id,
      job_name: jobs.name,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .leftJoin(zones, eq(users.zone_id, zones.id))
    .leftJoin(shifts, eq(users.shift_id, shifts.id))
    .leftJoin(departments, eq(users.department_id, departments.id))
    .leftJoin(jobs, eq(users.job_id, jobs.id))
    .where(eq(users.id, currentUserId))
    .limit(1);

  if (!userRecord[0]) {
    throw new NotFound("User profile not found");
  }

  const profile = {
    ...userRecord[0],
    zone: userRecord[0].zone_id ? { id: userRecord[0].zone_id, name: userRecord[0].zone_name } : null,
    shift: userRecord[0].shift_id ? { id: userRecord[0].shift_id, name: userRecord[0].shift_name } : null,
    department: userRecord[0].department_id ? { id: userRecord[0].department_id, name: userRecord[0].department_name } : null,
    job: userRecord[0].job_id ? { id: userRecord[0].job_id, name: userRecord[0].job_name } : null,
  };

  return SuccessResponse(res, { profile }, 200);
};

// ✅ Update Current User Profile
export const updateProfile = async (req: Request, res: Response) => {
  const currentUserId = req.user?.id;
  if (!currentUserId) {
    throw new UnauthorizedError("Authentication required");
  }

  const validated = await updateProfileSchema.parseAsync({
    body: req.body,
  });

  const { name, email, phone, whatsapp, password, image } = validated.body;

  // 1. Verify user exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.id, currentUserId))
    .limit(1);

  if (!existingUser[0]) {
    throw new NotFound("User not found");
  }

  // 2. Check email uniqueness (if changed)
  if (email && email.toLowerCase() !== existingUser[0].email.toLowerCase()) {
    const duplicateEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(and(sql`LOWER(TRIM(${users.email})) = LOWER(${email})`, ne(users.id, currentUserId)))
      .limit(1);

    if (duplicateEmail[0]) {
      throw new BadRequest("Email already exists");
    }
  }

  // 3. Check phone uniqueness (if changed)
  if (phone && phone !== existingUser[0].phone) {
    const duplicatePhone = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.phone, phone), ne(users.id, currentUserId)))
      .limit(1);

    if (duplicatePhone[0]) {
      throw new BadRequest("Phone already exists");
    }
  }

  // 4. Handle image upload and delete old photo from server if it exists
  let updatedImageUrl: string | null = existingUser[0].image;

  if (req.file) {
    // New file uploaded via multipart FormData
    if (existingUser[0].image) {
      await deletePhotoFromServer(existingUser[0].image);
    }
    updatedImageUrl = getFileUrl(req, req.file, "Users");
  } else if (image !== undefined) {
    if (image && typeof image === "string" && image.startsWith("data:")) {
      // Base64 image uploaded
      if (existingUser[0].image) {
        await deletePhotoFromServer(existingUser[0].image);
      }
      const saved = await saveBase64Image(req, image, "Users");
      updatedImageUrl = saved.url;
    } else if (image === "" || image === null || image === "null") {
      // Image removed
      if (existingUser[0].image) {
        await deletePhotoFromServer(existingUser[0].image);
      }
      updatedImageUrl = null;
    }
  }

  // 5. Build update data payload
  const updateData: Record<string, any> = {};

  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
  if (updatedImageUrl !== existingUser[0].image) updateData.image = updatedImageUrl;

  // 6. Handle password (min 7 chars, hash with bcrypt)
  if (password && typeof password === "string" && password.trim().length > 0) {
    if (password.trim().length < 7) {
      throw new BadRequest("Password must be at least 7 characters");
    }
    updateData.password = await bcrypt.hash(password.trim(), 10);
  }

  // 7. Save updates to database
  if (Object.keys(updateData).length > 0) {
    await db.update(users).set(updateData).where(eq(users.id, currentUserId));
  }

  // 8. Fetch updated user details
  const updatedUserRecord = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      whatsapp: users.whatsapp,
      image: users.image,
      role: users.role,
      status: users.status,
      points: users.points,
      yearly_holidays: users.yearly_holidays,
      zone_id: users.zone_id,
      shift_id: users.shift_id,
      department_id: users.department_id,
      job_id: users.job_id,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, currentUserId))
    .limit(1);

  const updatedUser = updatedUserRecord[0];

  // 9. Generate fresh token
  const token = generateUserToken({
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    phone: updatedUser.phone,
    role: updatedUser.role,
  });

  return SuccessResponse(
    res,
    {
      message: "Profile updated successfully",
      token,
      user: updatedUser,
    },
    200
  );
};
