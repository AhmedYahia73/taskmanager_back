// src/models/superadmin/salesProjects.ts

import {
  mysqlTable,
  varchar,
  timestamp,
  char,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const salesProjects = mysqlTable("sales_projects", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 200 }).notNull(),
  logo: varchar("logo", { length: 500 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
