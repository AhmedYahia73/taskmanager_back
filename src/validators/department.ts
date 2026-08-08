import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional().nullable(),
  zone_id: z.string().min(1, "Zone ID is required"),
  manager_id: z.string().min(1, "Manager ID is required"),
  status: z.boolean().default(true),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();
