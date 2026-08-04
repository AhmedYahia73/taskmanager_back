// src/models/schema/applications.ts

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

export const applications = mysqlTable("applications", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  qualification_id: char("qualification_id", { length: 36 }).references(() => qualifications.id).notNull(),
  job_id: char("job_id", { length: 36 }).references(() => jobs.id).notNull(),
  city_id: char("city_id", { length: 36 }).references(() => cities.id).notNull(),
  
  name: varchar("name", { length: 200 }).notNull(), 
  address: varchar("address", { length: 400 }).notNull(), 
  birthdate: date("birthdate"), 
  graduate_date: date("graduate_date"),
  expected_salary: int("expected_salary"),
  
  // تم التصحيح: marital بدلاً من material
  marital_status: mysqlEnum("marital_status", ["single", "married", "separated"]),
  
  phone: varchar("phone", { length: 44 }).notNull(), 
  
  // تم التصحيح إملائياً، ويمكنك تركها varchar أو تحويلها لـ text
  experiences: text("experiences"), 
  
  current_job: varchar("current_job", { length: 200 }), 
  courses: varchar("courses", { length: 200 }), 
  university: varchar("university", { length: 200 }), 
  
  // تم التصحيح: college بدلاً من collage
  college: varchar("college", { length: 200 }), 
  
  upload_cv: varchar("upload_cv", { length: 200 }).notNull(), 
  link: varchar("link", { length: 200 }), 
  favourite: boolean("favourite").default(false), 
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});