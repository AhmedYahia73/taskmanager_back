// src/models/superadmin/notifications.ts

import {
  mysqlTable,
  varchar,
  timestamp,
  char,
  boolean,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const notifications = mysqlTable("notifications", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  user_id: char("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  target: varchar("target", { length: 50 }).default("user").notNull(), // 'admin' | 'user'
  type: varchar("type", { length: 50 }).default("general").notNull(), // 'task_status' | 'online_days' | 'general'
  description: varchar("description", { length: 500 }).notNull(),
  link: varchar("link", { length: 255 }), // e.g. '/admin/tasks' or '/attendance'
  is_read: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
