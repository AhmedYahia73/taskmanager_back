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
  yearly_holidays: int("yearly_holidays").default(0),

  rejected_online_deduction: int("rejected_online_deduction").default(0),
  rejected_holiday_deduction: int("rejected_holiday_deduction").default(0),
  online_without_permission_deduction: int("online_without_permission_deduction").default(0),
  holiday_without_permission_deduction: int("holiday_without_permission_deduction").default(0),
  delay_per_hour_deduction: int("delay_per_hour_deduction").default(0),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
