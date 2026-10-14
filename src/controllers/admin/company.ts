import { Request, Response } from "express";
import { db } from "../../models/db";
import { companies } from "../../models/schema";
import { SuccessResponse } from "../../utils/response";
import { eq } from "drizzle-orm";
import { NotFound } from "../../Errors";
import { saveBase64Image } from "../../utils/handleImages";
import { deletePhotoFromServer } from "../../utils/deleteImage";
import { getFileUrl } from "../../middlewares/upload";

export async function getCompany(req: Request, res: Response) {
  const result = await db.select().from(companies).limit(1);
  return SuccessResponse(res, result.length > 0 ? result[0] : null, 200);
}

export async function updateCompany(req: Request, res: Response) {
  const body = req.body;
  const existing = await db.select().from(companies).limit(1);

  let companyLogo = existing.length > 0 ? existing[0].logo : null;

  if (req.file) {
    companyLogo = getFileUrl(req, req.file, "companies");
    if (existing.length > 0 && existing[0].logo) {
      await deletePhotoFromServer(existing[0].logo);
    }
  } else if (body.logo && typeof body.logo === "string" && body.logo.startsWith("data:")) {
    const result = await saveBase64Image(req, body.logo, "companies");
    companyLogo = result.url;
    if (existing.length > 0 && existing[0].logo) {
      await deletePhotoFromServer(existing[0].logo);
    }
  } else if (body.logo && typeof body.logo === "string" && body.logo !== "null" && body.logo !== "undefined") {
    companyLogo = body.logo;
  }

  if (!companyLogo && existing.length === 0) {
    return res.status(400).json({ success: false, message: "Logo is required" });
  }

  const dataToSave = {
    name: body.name,
    owner_name: body.owner_name || null,
    address: body.address || null,
    phone: body.phone || null,
    whatts: body.whatts || null,
    facebook: body.facebook || null,
    instgram: body.instgram || null,
    email: body.email || null,
    logo: companyLogo || "",
  };

  if (existing.length === 0) {
    // Create first record if not exists
    await db.insert(companies).values(dataToSave);
  } else {
    // Update existing record
    await db.update(companies).set(dataToSave).where(eq(companies.id, existing[0].id));
  }

  const updated = await db.select().from(companies).limit(1);
  return SuccessResponse(res, updated[0], 200);
}
