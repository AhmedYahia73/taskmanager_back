"use strict";
// src/models/schema/jobs.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobs = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.jobs = (0, mysql_core_1.mysqlTable)("jobs", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    name: (0, mysql_core_1.varchar)("name", { length: 200 }).notNull(),
    status: (0, mysql_core_1.boolean)("status").default(true),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
