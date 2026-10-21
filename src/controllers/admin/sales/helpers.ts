// src/controllers/admin/sales/helpers.ts

import { Request } from "express";

export const getProjectId = (req: Request): string | undefined => {
  const pid = req.salesProjectId || (req.headers["x-sales-project-id"] as string) || (req.headers["sales_project_id"] as string) || req.user?.project_id;
  return pid ? String(pid).trim() : undefined;
};

export const isLeader = (role?: string): boolean => {
  return role === "leader" || role === "leader_sales";
};

export const isAdminRole = (role?: string): boolean => {
  return role === "admin" || role === "super_admin";
};
