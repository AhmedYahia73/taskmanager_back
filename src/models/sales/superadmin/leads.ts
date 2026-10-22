import {
  mysqlTable,
  varchar,
  timestamp,
  char,
  double,
  json,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { salesProjects } from "./salesProjects";

export const leads = mysqlTable("leads", {
  id: char("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  sales_project_id: char("sales_project_id", { length: 36 }).references(() => salesProjects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  sales_id: char("sales_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  place_name: varchar("place_name", { length: 255 }),
  place_phone: varchar("place_phone", { length: 20 }),
  lat: double("lat").notNull(),
  lng: double("lng").notNull(),
  address: varchar("address", { length: 500 }).notNull(),
  notes: varchar("notes", { length: 1000 }),
  products: json("products"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
