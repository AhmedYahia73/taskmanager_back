"use strict";
// src/models/schema/salaries.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.salaries = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const users_1 = require("./users");
exports.salaries = (0, mysql_core_1.mysqlTable)("salaries", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    user_id: (0, mysql_core_1.char)("user_id", { length: 36 }).references(() => users_1.users.id, { onDelete: "cascade" }),
    salary: (0, mysql_core_1.int)("salary").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
