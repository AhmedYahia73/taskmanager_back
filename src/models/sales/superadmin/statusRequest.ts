// src/models/schema/statusRequest.ts

import {
  mysqlTable,
  timestamp,
  mysqlEnum,
  char
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from './users';
import { visits } from './visits';
import { salesProjects } from './salesProjects';

export const statusRequest = mysqlTable("status_requests", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  sales_project_id: char("sales_project_id", { length: 36 }).references(() => salesProjects.id, { onDelete: "cascade" }),
  visitId: char("visit_id", { length: 36 })
    .notNull()
    .references(() => visits.id, { onDelete: "cascade" }),
  userId: char("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  from: mysqlEnum("from", ["visit", "sales", "delivered"]).notNull(),
  to: mysqlEnum("to", ["visit", "sales", "delivered"]).notNull(),
  status: mysqlEnum("status", ["pending", "approve", "reject"]).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
