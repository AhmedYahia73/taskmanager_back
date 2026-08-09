// src/models/schema/departments.ts

import {
  mysqlTable,
  varchar,
  timestamp, 
  char, 
  boolean,
  text 
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { zones } from "./zones";
import { users } from "./users";

// تم إزالة الاستيرادات غير المستخدمة (users, projectGroups, projects)

export const departments = mysqlTable("departments", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  zone_id: char("zone_id", { length: 36 }).references(() => zones.id).notNull(),
  manager_id: char("manager_id", { length: 36 }).references(() => users.id).notNull(),
  
  name: varchar("name", { length: 200 }).notNull(), 
  description: text("description"), 
  
  status: boolean("status").default(true), 
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});