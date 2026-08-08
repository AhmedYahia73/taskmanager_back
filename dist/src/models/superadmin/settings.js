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
    yearly_holidays: (0, mysql_core_1.int)("yearly_holidays").default(0),
    rejected_online_deduction: (0, mysql_core_1.float)("rejected_online_deduction").default(0),
    rejected_holiday_deduction: (0, mysql_core_1.float)("rejected_holiday_deduction").default(0),
    online_without_permission_deduction: (0, mysql_core_1.float)("online_without_permission_deduction").default(0),
    holiday_without_permission_deduction: (0, mysql_core_1.float)("holiday_without_permission_deduction").default(0),
    delay_per_hour_deduction: (0, mysql_core_1.float)("delay_per_hour_deduction").default(0),
    router_ip_status: (0, mysql_core_1.boolean)("router_ip_status").default(true),
    router_ip: (0, mysql_core_1.varchar)("router_ip", { length: 30 }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
