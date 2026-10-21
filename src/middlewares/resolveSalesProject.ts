// src/middlewares/resolveSalesProject.ts

import { Request, Response, NextFunction } from "express";
import { BadRequest } from "../Errors/BadRequest";
import { UnauthorizedError } from "../Errors";
import { db } from "../models/db";
import { salesProjects, salesProjectUsers } from "../models/schema";
import { eq, and } from "drizzle-orm";

export const resolveSalesProject = async (req: Request, res: Response, next: NextFunction) => {
  const projectId =
    (req.headers["x-sales-project-id"] as string) ||
    (req.headers["sales_project_id"] as string) ||
    (req.query.sales_project_id as string) ||
    (req.query.project_id as string) ||
    (req.body && req.body.sales_project_id) ||
    (req.body && req.body.project_id) ||
    req.user?.project_id;

  if (!projectId || typeof projectId !== "string" || projectId.trim() === "") {
    throw new BadRequest("Sales Project ID is required. Please select a sales project.");
  }

  const cleanProjectId = projectId.trim();

  // Verify project exists
  const [project] = await db
    .select({ id: salesProjects.id })
    .from(salesProjects)
    .where(eq(salesProjects.id, cleanProjectId))
    .limit(1);

  if (!project) {
    throw new BadRequest("Selected sales project does not exist.");
  }

  // If user is sales or leader_sales, verify assignment
  const currentUser = req.user;
  if (currentUser && (currentUser.role === "sales" || currentUser.role === "leader_sales")) {
    const [assignment] = await db
      .select({ id: salesProjectUsers.id })
      .from(salesProjectUsers)
      .where(
        and(
          eq(salesProjectUsers.sales_project_id, cleanProjectId),
          eq(salesProjectUsers.user_id, currentUser.id)
        )
      )
      .limit(1);

    if (!assignment) {
      throw new UnauthorizedError("You are not assigned to this sales project.");
    }
  }

  req.salesProjectId = cleanProjectId;
  next();
};
