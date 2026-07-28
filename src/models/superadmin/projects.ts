// src/models/schema/projects.ts

import {
  mysqlTable,
  varchar,
  timestamp,
  char
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./users"; 

export const projects = mysqlTable("projects", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 200 }).notNull(),
  description: varchar("description", { length: 1000 }),
  documentation: varchar("documentation", { length: 200 }),
  tester_id: char("tester_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});