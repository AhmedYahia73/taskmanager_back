// src/models/schema/settings.ts

import {
  mysqlTable,
  int,
  varchar,
  timestamp,
  mysqlEnum,
  char,
  json,
  AnyMySqlColumn
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm"; 
export const settings = mysqlTable("settings", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`), 

  user: varchar("user", { length: 200 }).notNull(),
  leader: varchar("leader", { length: 200 }).notNull(),
  admin: varchar("admin", { length: 200 }).notNull(),

  task_approve_points: int("task_approve_points"),
  task_edit_points: int("task_edit_points"),
  task_delay_points: int("task_delay_points"),
  
  online_days: json("online_days"),
  delay_premission_minutes: int("delay_premission_minutes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
