// src/models/sales/superadmin/salesProjectUsers.ts

import { mysqlTable, char, timestamp } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { salesProjects } from "./salesProjects";

export const salesProjectUsers = mysqlTable("sales_project_users", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  sales_project_id: char("sales_project_id", { length: 36 }).references(() => salesProjects.id, { onDelete: "cascade" }),
  user_id: char("user_id", { length: 36 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
