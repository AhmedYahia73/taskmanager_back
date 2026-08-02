// src/models/schema/salaries.ts

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
import { users } from "./users"; 
export const salaries = mysqlTable("salaries", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`), 

  user_id: char("user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }),
  salary: int("salary").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
