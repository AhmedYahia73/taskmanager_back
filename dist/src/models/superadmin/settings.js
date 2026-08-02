"use strict";
// src/models/schema/settings.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.settings = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.settings = (0, mysql_core_1.mysqlTable)("settings", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    user: (0, mysql_core_1.varchar)("user", { length: 200 }).notNull(),
    leader: (0, mysql_core_1.varchar)("leader", { length: 200 }).notNull(),
    admin: (0, mysql_core_1.varchar)("admin", { length: 200 }).notNull(),
    task_approve_points: (0, mysql_core_1.int)("task_approve_points"),
    task_edit_points: (0, mysql_core_1.int)("task_edit_points"),
    task_delay_points: (0, mysql_core_1.int)("task_delay_points"),
    online_days: (0, mysql_core_1.json)("online_days"),
    delay_premission_minutes: (0, mysql_core_1.int)("delay_premission_minutes"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
