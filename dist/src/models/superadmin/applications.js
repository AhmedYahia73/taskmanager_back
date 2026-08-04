"use strict";
// src/models/schema/applications.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.applications = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const qualifications_1 = require("./qualifications");
const jobs_1 = require("./jobs");
const cities_1 = require("./cities");
// تم إزالة الاستيرادات غير المستخدمة (users, projectGroups, projects)
exports.applications = (0, mysql_core_1.mysqlTable)("applications", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    qualification_id: (0, mysql_core_1.char)("qualification_id", { length: 36 }).references(() => qualifications_1.qualifications.id).notNull(),
    job_id: (0, mysql_core_1.char)("job_id", { length: 36 }).references(() => jobs_1.jobs.id).notNull(),
    city_id: (0, mysql_core_1.char)("city_id", { length: 36 }).references(() => cities_1.cities.id).notNull(),
    name: (0, mysql_core_1.varchar)("name", { length: 200 }).notNull(),
    address: (0, mysql_core_1.varchar)("address", { length: 400 }).notNull(),
    birthdate: (0, mysql_core_1.date)("birthdate"),
    graduate_date: (0, mysql_core_1.date)("graduate_date"),
    expected_salary: (0, mysql_core_1.int)("expected_salary"),
    // تم التصحيح: marital بدلاً من material
    marital_status: (0, mysql_core_1.mysqlEnum)("marital_status", ["single", "married", "separated"]),
    phone: (0, mysql_core_1.varchar)("phone", { length: 44 }).notNull(),
    // تم التصحيح إملائياً، ويمكنك تركها varchar أو تحويلها لـ text
    experiences: (0, mysql_core_1.text)("experiences"),
    current_job: (0, mysql_core_1.varchar)("current_job", { length: 200 }),
    courses: (0, mysql_core_1.varchar)("courses", { length: 200 }),
    university: (0, mysql_core_1.varchar)("university", { length: 200 }),
    // تم التصحيح: college بدلاً من collage
    college: (0, mysql_core_1.varchar)("college", { length: 200 }),
    upload_cv: (0, mysql_core_1.varchar)("upload_cv", { length: 200 }).notNull(),
    link: (0, mysql_core_1.varchar)("link", { length: 200 }),
    favourite: (0, mysql_core_1.boolean)("favourite").default(false),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
