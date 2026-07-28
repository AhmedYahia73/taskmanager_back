"use strict";
// src/models/schema/projects.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.projects = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const users_1 = require("./users");
exports.projects = (0, mysql_core_1.mysqlTable)("projects", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    name: (0, mysql_core_1.varchar)("name", { length: 200 }).notNull(),
    description: (0, mysql_core_1.varchar)("description", { length: 1000 }),
    documentation: (0, mysql_core_1.varchar)("documentation", { length: 200 }),
    tester_id: (0, mysql_core_1.char)("tester_id", { length: 36 }).references(() => users_1.users.id, { onDelete: "set null" }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
