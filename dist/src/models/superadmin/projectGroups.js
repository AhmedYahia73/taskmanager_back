"use strict";
// src/models/schema/projectGroups.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectGroups = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const projects_1 = require("./projects");
exports.projectGroups = (0, mysql_core_1.mysqlTable)("projectGroups", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    name: (0, mysql_core_1.varchar)("name", { length: 200 }).notNull(),
    description: (0, mysql_core_1.varchar)("description", { length: 1000 }),
    project_id: (0, mysql_core_1.char)("project_id", { length: 36 }).references(() => projects_1.projects.id, { onDelete: "cascade" }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
