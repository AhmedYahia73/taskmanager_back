"use strict";
// src/models/schema/tasks.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasks = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const users_1 = require("./users");
const projectGroups_1 = require("./projectGroups");
const projects_1 = require("./projects");
exports.tasks = (0, mysql_core_1.mysqlTable)("tasks", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    name: (0, mysql_core_1.varchar)("name", { length: 200 }).notNull(),
    description: (0, mysql_core_1.varchar)("description", { length: 1000 }),
    user_id: (0, mysql_core_1.char)("user_id", { length: 36 }).references(() => users_1.users.id, { onDelete: "set null" }),
    group_id: (0, mysql_core_1.char)("group_id", { length: 36 }).references(() => projectGroups_1.projectGroups.id, { onDelete: "cascade" }),
    project_id: (0, mysql_core_1.char)("project_id", { length: 36 }).references(() => projects_1.projects.id, { onDelete: "cascade" }),
    is_edit: (0, mysql_core_1.boolean)("is_edit").default(false),
    documentation: (0, mysql_core_1.varchar)("documentation", { length: 200 }),
    delivery_date: (0, mysql_core_1.date)("delivery_date"),
    inprogress_date: (0, mysql_core_1.date)("inprogress_date"),
    done_date: (0, mysql_core_1.date)("done_date"),
    extra_points: (0, mysql_core_1.int)("extra_points").default(0),
    points: (0, mysql_core_1.int)("points").default(0),
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "inprogress", "done", "edit", "approve"]).default("pending"),
    importanc_status: (0, mysql_core_1.mysqlEnum)("importanc_status", ["low", "medium", "high", "urgent"]).default("medium"),
    tester_note: (0, mysql_core_1.varchar)("tester_note", { length: 1000 }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
