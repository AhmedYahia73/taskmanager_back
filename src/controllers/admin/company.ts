import { Request, Response } from "express";
import { db } from "../../models/db";
import { companies } from "../../models/schema";
import { SuccessResponse } from "../../utils/response";
import { eq } from "drizzle-orm";
import { NotFound } from "../../Errors";

export async function getCompany(req: Request, res: Response) {
  const result = await db.select().from(companies).limit(1);
  return SuccessResponse(res, result.length > 0 ? result[0] : null, 200);
}

export async function updateCompany(req: Request, res: Response) {
  const body = req.body;
  const existing = await db.select().from(companies).limit(1);

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
