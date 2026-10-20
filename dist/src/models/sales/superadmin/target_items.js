"use strict";
// src/models/schema/target_items.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.target_items = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const targets_1 = require("./targets");
const salesProjects_1 = require("./salesProjects");
exports.target_items = (0, mysql_core_1.mysqlTable)("target_items", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    sales_project_id: (0, mysql_core_1.char)("sales_project_id", { length: 36 }).references(() => salesProjects_1.salesProjects.id, { onDelete: "cascade" }),
    year: (0, mysql_core_1.int)("year").notNull(),
    month: (0, mysql_core_1.int)("month").notNull(),
    number: (0, mysql_core_1.double)("number").notNull(),
    target_id: (0, mysql_core_1.char)("target_id", { length: 36 }).references(() => targets_1.targets.id, { onDelete: "cascade" }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
