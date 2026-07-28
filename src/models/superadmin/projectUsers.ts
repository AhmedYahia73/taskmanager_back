// src/models/schema/projectUsers.ts

import {
  mysqlTable,
  int,
  varchar,
  timestamp,
  mysqlEnum,
  char,
  AnyMySqlColumn
} from "drizzle-orm/mysql-core";
import { users } from "./users"; 
import { projects } from "./projects"; 

import { sql } from "drizzle-orm"; 
export const projectUsers = mysqlTable("projectUsers", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`), 

  user_id: char("user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }),
  project_id: char("project_id", { length: 36 }).references(() => projects.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
