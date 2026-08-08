import { Request, Response } from "express";
import { db } from "../../models/db";
import { departments, zones, users } from "../../models/schema";
import { SuccessResponse } from "../../utils/response";
import { eq, like, desc, sql } from "drizzle-orm";
import { NotFound } from "../../Errors";

export async function getAllDepartments(req: Request, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = (req.query.search as string) || "";
  const offset = (page - 1) * limit;

  let query = db
    .select({
      id: departments.id,
      name: departments.name,
      description: departments.description,
      status: departments.status,
      zone_id: departments.zone_id,
      manager_id: departments.manager_id,
      zone_name: zones.name,
      manager_name: users.name,
      createdAt: departments.createdAt,
    })
    .from(departments)
    .leftJoin(zones, eq(departments.zone_id, zones.id))
    .leftJoin(users, eq(departments.manager_id, users.id))
    .where(like(departments.name, `%${search}%`))
    .orderBy(desc(departments.createdAt))
    .limit(limit)
    .offset(offset);

  let countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(departments)
    .where(like(departments.name, `%${search}%`));

  const [data, totalCountResult] = await Promise.all([query, countQuery]);
  const total = totalCountResult[0]?.count || 0;

  return SuccessResponse(
    res,
    {
      departments: data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
    200
  );
}

export async function getDepartmentDependencies(req: Request, res: Response) {
  const zonesData = await db.select({ id: zones.id, name: zones.name }).from(zones);
  const managersData = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.role, "engineer"));

  return SuccessResponse(
    res,
    {
      zones: zonesData,
      managers: managersData,
    },
    200
  );
}

export async function createDepartment(req: Request, res: Response) {
  const body = req.body;
  await db.insert(departments).values(body);
  return SuccessResponse(res, { message: "Department created successfully" }, 201);
}

export async function updateDepartment(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body;
  
  const existing = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
  if (!existing[0]) {
    throw new NotFound("Department not found");
  }

  await db.update(departments).set(body).where(eq(departments.id, id));
  return SuccessResponse(res, { message: "Department updated successfully" }, 200);
}

export async function deleteDepartment(req: Request, res: Response) {
  const { id } = req.params;
  const existing = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
  if (!existing[0]) {
    throw new NotFound("Department not found");
  }

  await db.delete(departments).where(eq(departments.id, id));
  return SuccessResponse(res, { message: "Department deleted successfully" }, 200);
}
