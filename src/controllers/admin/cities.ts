import { Request, Response } from "express";
import { db } from "../../models/db";
import { cities } from "../../models/schema"; 
import { SQL, and, eq, like, count, desc } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
export const createCitySchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }).min(1).max(200),
    status: z.boolean().optional(),
  }),
});

export const updateCitySchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }).uuid("Invalid ID format"),
  }),
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    status: z.boolean().optional(),
  }),
});

export const CityIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }).uuid("Invalid ID format"),
  }),
});

// ==========================================
// 🎮 Controllers
// ==========================================
export const getAllCities = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const offset = (page - 1) * limit;

    let query = db.select().from(cities).orderBy(desc(cities.createdAt)).$dynamic();
    let countQuery = db.select({ total: count() }).from(cities).$dynamic();

    if (search) {
        query = query.where(like(cities.name, `%${search}%`));
        countQuery = countQuery.where(like(cities.name, `%${search}%`));
    }

    const [allCities, [{ total: totalCount }]] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery
    ]);

    SuccessResponse(res, { 
        cities: allCities,
        pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit)
        }
    }, 200);
};

export const getCityById = async (req: Request, res: Response) => {
    const validated = await CityIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 

    const result = await db.select().from(cities).where(eq(cities.id, id)).limit(1);
    if (!result[0]) throw new NotFound("City not found");

    SuccessResponse(res, { city: result[0] }, 200);
};

export const createCity = async (req: Request, res: Response) => {
    const validated = await createCitySchema.parseAsync({ body: req.body });
    const { name, status } = validated.body;

    const id = uuidv4();
    await db.insert(cities).values({ id, name, status: status ?? true });

    SuccessResponse(res, { message: "City created successfully" }, 201);
};

export const updateCity = async (req: Request, res: Response) => {
    const validated = await updateCitySchema.parseAsync({ params: req.params, body: req.body });
    const { id } = validated.params;
    const { name, status } = validated.body;

    const existing = await db.select().from(cities).where(eq(cities.id, id)).limit(1);
    if (!existing[0]) throw new NotFound("City not found");

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
  
    if (Object.keys(updateData).length > 0) {
        await db.update(cities).set(updateData).where(eq(cities.id, id));
    }

    SuccessResponse(res, { message: "City updated successfully" }, 200);
};

export const deleteCity = async (req: Request, res: Response) => {
    const validated = await CityIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 
 
    const existing = await db.select().from(cities).where(eq(cities.id, id)).limit(1);
    if (!existing[0]) throw new NotFound("City not found");

    await db.delete(cities).where(eq(cities.id, id));
    SuccessResponse(res, { message: "City deleted successfully" }, 200);
};
