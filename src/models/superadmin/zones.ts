// src/models/schema/zones.ts

import {
  mysqlTable,
  varchar,
  timestamp,
  json,
  mysqlEnum,
  char,
  date,
  int,
  boolean,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm"; 

export const zones = mysqlTable("zones", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 200 }).notNull(),
  locations: json("locations"),
  status: boolean("status").default(true),
  router_mac_status: boolean("router_mac_status").default(false),
  router_mac: varchar("router_mac", { length: 100 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});