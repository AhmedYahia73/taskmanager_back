"use strict";
// src/models/schema/departments.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.departments = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const zones_1 = require("./zones");
const users_1 = require("./users");
// تم إزالة الاستيرادات غير المستخدمة (users, projectGroups, projects)
exports.departments = (0, mysql_core_1.mysqlTable)("departments", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    zone_id: (0, mysql_core_1.char)("zone_id", { length: 36 }).references(() => zones_1.zones.id).notNull(),
    manager_id: (0, mysql_core_1.char)("manager_id", { length: 36 }).references(() => users_1.users.id).notNull(),
    name: (0, mysql_core_1.varchar)("name", { length: 200 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    status: (0, mysql_core_1.boolean)("status").default(true),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
