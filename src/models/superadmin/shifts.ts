// src/models/schema/zones.ts

import {
  mysqlTable, 
  timestamp, 
  char, 
  datetime,
  varchar,
  json,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm"; 
import { zones } from "./zones"; 

export const shifts = mysqlTable("shifts", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 200 }).notNull(),
  zone_id: char("zone_id", { length: 36 }).references(() => zones.id, { onDelete: "cascade" }),
  days: json("days").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});