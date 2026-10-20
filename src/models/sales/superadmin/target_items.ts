// src/models/schema/target_items.ts

import {
  mysqlTable,
  timestamp,
  double,
  char,
  int 
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { targets } from "./targets";
import { salesProjects } from "./salesProjects";

export const target_items = mysqlTable("target_items", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  sales_project_id: char("sales_project_id", { length: 36 }).references(() => salesProjects.id, { onDelete: "cascade" }),
  year: int("year").notNull(),
  month: int("month").notNull(),
  number: double("number").notNull(),
  target_id: char("target_id", { length: 36 }).references(() => targets.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
