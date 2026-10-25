"use strict";
// src/models/schema/users.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const zones_1 = require("./zones");
const shifts_1 = require("./shifts");
const departments_1 = require("./departments");
const jobs_1 = require("./jobs");
exports.users = (0, mysql_core_1.mysqlTable)("users", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    name: (0, mysql_core_1.varchar)("name", { length: 200 }).notNull(),
    email: (0, mysql_core_1.varchar)("email", { length: 100 }).notNull().unique(),
    phone: (0, mysql_core_1.varchar)("phone", { length: 20 }).notNull().unique(),
    whatsapp: (0, mysql_core_1.varchar)("whatsapp", { length: 20 }),
    image: (0, mysql_core_1.varchar)("image", { length: 200 }),
    vector_image_array: (0, mysql_core_1.json)("vector_image_array"),
    password: (0, mysql_core_1.varchar)("password", { length: 255 }).notNull(),
    status: (0, mysql_core_1.mysqlEnum)("status", ["active", "inactive"]).default("active"),
    role: (0, mysql_core_1.mysqlEnum)("role", ["super_admin", "admin", "engineer", "sales", "leader_sales"]).notNull().default("engineer"),
    points: (0, mysql_core_1.int)("points").default(0),
    yearly_holidays: (0, mysql_core_1.boolean)("yearly_holidays").default(false),
    zone_id: (0, mysql_core_1.char)("zone_id", { length: 36 }).references(() => zones_1.zones.id, { onDelete: "cascade" }),
    shift_id: (0, mysql_core_1.char)("shift_id", { length: 36 }).references(() => shifts_1.shifts.id, { onDelete: "cascade" }),
    department_id: (0, mysql_core_1.char)("department_id", { length: 36 }).references(() => departments_1.departments.id, { onDelete: "set null" }),
    job_id: (0, mysql_core_1.char)("job_id", { length: 36 }).references(() => jobs_1.jobs.id, { onDelete: "set null" }),
    // Sales CRM Integration Fields (No FK constraints so Parent remains independent)
    leader_id: (0, mysql_core_1.char)("leader_id", { length: 36 }).references(() => exports.users.id, { onDelete: "set null" }),
    target_id: (0, mysql_core_1.char)("target_id", { length: 36 }),
    sales_project_id: (0, mysql_core_1.char)("sales_project_id", { length: 36 }),
    sales_project_ids: (0, mysql_core_1.json)("sales_project_ids"),
    online_days: (0, mysql_core_1.json)("online_days"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
