// src/models/schema/visits.ts

import {
  mysqlTable,
  varchar,
  timestamp,
  mysqlEnum,
  char,
  double,
  int,
  json,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { visitStatus } from "./visitStatus";
import { users } from "./users";
import { salesProjects } from "./salesProjects";

export const visits = mysqlTable("visits", {
  id: char("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  sales_project_id: char("sales_project_id", { length: 36 }).references(() => salesProjects.id, { onDelete: "cascade" }),
  lat: double("lat").notNull(),
  lng: double("lng").notNull(),

  name: varchar("name", { length: 255 }).notNull(),

  owner_name: varchar("owner_name", { length: 255 }),
  owner_phone: varchar("owner_phone", { length: 20 }),
  address: varchar("address", { length: 500 }).notNull(),
  notes: varchar("notes", { length: 1000 }),
  phone: varchar("phone", { length: 20 }).notNull(),
  points: int("points").default(0),
  
  status: mysqlEnum("status", ["visit", "sales", "delivered"]).default("visit"),
  status_id: char("status_id", { length: 36 }).references(() => visitStatus.id, { onDelete: "set null" }),
  sales_id: char("sales_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  products: json("products"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
