// src/models/schema/targets.ts

import {
  mysqlTable,
  varchar,
  timestamp,
  mysqlEnum,
  char
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { salesProjects } from "./salesProjects";

export const targets = mysqlTable("targets", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  sales_project_id: char("sales_project_id", { length: 36 }).references(() => salesProjects.id, { onDelete: "cascade" }),
  type: mysqlEnum("type", ["visit", "sales", "points"]).default("visit"),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
