"use strict";
// src/models/sales/superadmin/salesProjectUsers.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesProjectUsers = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const salesProjects_1 = require("./salesProjects");
exports.salesProjectUsers = (0, mysql_core_1.mysqlTable)("sales_project_users", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    sales_project_id: (0, mysql_core_1.char)("sales_project_id", { length: 36 }).references(() => salesProjects_1.salesProjects.id, { onDelete: "cascade" }),
    user_id: (0, mysql_core_1.char)("user_id", { length: 36 }).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
