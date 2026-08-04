// src/models/schema/qualifications.ts

import {
  mysqlTable,
  varchar,
  timestamp,
  mysqlEnum,
  char,
  date,
  int,
  boolean,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./users"; 
import { projectGroups } from "./projectGroups"; 
import { projects } from "./projects"; 

export const qualifications = mysqlTable("qualifications", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 200 }).notNull(), 
  status: boolean("status").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});