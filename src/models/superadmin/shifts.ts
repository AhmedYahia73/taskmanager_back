// src/models/schema/zones.ts

import {
  mysqlTable, 
  timestamp, 
  char, 
  datetime,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm"; 
import { zones } from "./zones"; 

export const shifts = mysqlTable("shifts", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 200 }).notNull(),
  zone_id: char("zone_id", { length: 36 }).references(() => zones.id, { onDelete: "cascade" }),
  from: datetime("from").notNull(),
  to: datetime("to").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});