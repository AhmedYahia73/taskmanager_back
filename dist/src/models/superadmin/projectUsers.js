"use strict";
// src/models/schema/projectUsers.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectUsers = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const users_1 = require("./users");
const projects_1 = require("./projects");
const drizzle_orm_1 = require("drizzle-orm");
exports.projectUsers = (0, mysql_core_1.mysqlTable)("projectUsers", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    user_id: (0, mysql_core_1.char)("user_id", { length: 36 }).references(() => users_1.users.id, { onDelete: "cascade" }),
    project_id: (0, mysql_core_1.char)("project_id", { length: 36 }).references(() => projects_1.projects.id, { onDelete: "cascade" }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
