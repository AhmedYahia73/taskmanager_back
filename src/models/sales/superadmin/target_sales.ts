// src/models/schema/target_sales.ts

import {
  mysqlTable,
  timestamp,
  char
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { targets } from "./targets";
import { users } from "./users";
import { salesProjects } from "./salesProjects";

export const target_sales = mysqlTable("target_sales", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  sales_project_id: char("sales_project_id", { length: 36 }).references(() => salesProjects.id, { onDelete: "cascade" }),
  target_id: char("target_id", { length: 36 }).references(() => targets.id, { onDelete: "cascade" }),
  user_id: char("user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
