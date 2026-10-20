"use strict";
// src/models/superadmin/salesProjects.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesProjects = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.salesProjects = (0, mysql_core_1.mysqlTable)("sales_projects", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    name: (0, mysql_core_1.varchar)("name", { length: 200 }).notNull(),
    logo: (0, mysql_core_1.varchar)("logo", { length: 500 }).notNull(),
    design: (0, mysql_core_1.varchar)("design", { length: 50 }).default("design 1").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
