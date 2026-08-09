// src/models/schema/companies.ts

import {
  mysqlTable,
  varchar,
  timestamp,
  mysqlEnum,
  char,
  date,
  int,
  boolean,
  text // أضفنا text في حال أردت استخدامه للنصوص الطويلة
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { qualifications } from "./qualifications";
import { jobs } from "./jobs";
import { cities } from "./cities";

// تم إزالة الاستيرادات غير المستخدمة (users, projectGroups, projects)

export const companies = mysqlTable("companies", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  
  name: varchar("name", { length: 200 }).notNull(),
  owner_name: varchar("owner_name", { length: 200 }),
  address: varchar("address", { length: 400 }),
  
  phone: varchar("phone", { length: 44 }),
  whatts: varchar("whatts", { length: 100 }),
  facebook: varchar("facebook", { length: 200 }),
  instgram: varchar("instgram", { length: 200 }),
  logo: varchar("logo", { length: 200 }).notNull(),
  email: varchar("email", { length: 100 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});