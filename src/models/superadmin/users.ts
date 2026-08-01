// src/models/schema/users.ts

import {
  mysqlTable,
  int,
  varchar,
  timestamp,
  mysqlEnum,
  char,
  boolean,
  AnyMySqlColumn
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm"; 
export const users = mysqlTable("users", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`), 

  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  image: varchar("image", { length: 200 }),
  password: varchar("password", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active"),
  role: mysqlEnum("role", ["super_admin", "admin", "tester", "engineer"]).notNull().default("engineer"),
  points: int("points").default(0),
  yearly_holidays: boolean("yearly_holidays").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
