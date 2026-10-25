// src/models/superadmin/extraTimeRequests.ts

import {
  mysqlTable,
  mysqlEnum,
  char,
  date,
  boolean,
  timestamp,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const extraTimeRequests = mysqlTable("extra_time_requests", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: char("user_id", { length: 36 })
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  date: date("date").notNull(),
  early_attend: boolean("early_attend").default(false).notNull(),
  late_leave: boolean("late_leave").default(false).notNull(),
  status: mysqlEnum("status", ["pending", "approve", "reject"])
    .default("pending")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
