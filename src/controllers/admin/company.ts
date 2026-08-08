import { Request, Response } from "express";
import { db } from "../../models/db";
import { companies } from "../../models/schema";
import { SuccessResponse } from "../../utils/response";
import { eq } from "drizzle-orm";
import { NotFound } from "../../Errors";
import { saveBase64Image } from "../../utils/handleImages";
import { deletePhotoFromServer } from "../../utils/deleteImage";

export async function getCompany(req: Request, res: Response) {
  const result = await db.select().from(companies).limit(1);
  return SuccessResponse(res, result.length > 0 ? result[0] : null, 200);
}

export async function updateCompany(req: Request, res: Response) {
  const body = req.body;
  const existing = await db.select().from(companies).limit(1);

  let companyLogo = body.logo;
  if (body.logo && body.logo.startsWith("data:")) {
    const result = await saveBase64Image(req, body.logo, "companies");
    companyLogo = result.url;
    
    if (existing.length > 0 && existing[0].logo) {
      await deletePhotoFromServer(existing[0].logo);
    }
  }

  body.logo = companyLogo;

  if (existing.length === 0) {
    // Create first record if not exists
    await db.insert(companies).values(body);
  } else {
    // Update existing record
    await db.update(companies).set(body).where(eq(companies.id, existing[0].id));
  }

  const updated = await db.select().from(companies).limit(1);
  return SuccessResponse(res, updated[0], 200);
}
