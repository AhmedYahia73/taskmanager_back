// src/models/schema/tasks.ts

import {
  mysqlTable,
  varchar,
  timestamp,
  mysqlEnum,
  char,
  date
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./users"; 
import { projectGroups } from "./projectGroups"; 
import { projects } from "./projects"; 

export const tasks = mysqlTable("tasks", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 200 }).notNull(),
  description: varchar("description", { length: 1000 }),
  
  user_id: char("user_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  group_id: char("group_id", { length: 36 }).references(() => projectGroups.id, { onDelete: "cascade" }),
  project_id: char("project_id", { length: 36 }).references(() => projects.id, { onDelete: "cascade" }),
  
  documentation: varchar("documentation", { length: 200 }),
  delivery_date: date("delivery_date"),
  status: mysqlEnum("status", ["pending", "inprogress", "done", "edit", "approve"]).default("pending"),
  importanc_status: mysqlEnum("importanc_status", ["low", "medium", "high", "urgent"]).default("medium"),
  tester_note: varchar("tester_note", { length: 1000 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});