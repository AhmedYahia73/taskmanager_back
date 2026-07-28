// src/models/schema/projectGroups.ts

import {
  mysqlTable,
  varchar,
  timestamp,
  char
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { projects } from "./projects";

export const projectGroups = mysqlTable("projectGroups", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 200 }).notNull(),
  description: varchar("description", { length: 1000 }),
  project_id: char("project_id", { length: 36 }).references(() => projects.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});