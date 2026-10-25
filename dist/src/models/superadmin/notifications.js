"use strict";
// src/models/superadmin/notifications.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifications = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const users_1 = require("./users");
exports.notifications = (0, mysql_core_1.mysqlTable)("notifications", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    user_id: (0, mysql_core_1.char)("user_id", { length: 36 })
        .notNull()
        .references(() => users_1.users.id, { onDelete: "cascade" }),
    target: (0, mysql_core_1.varchar)("target", { length: 50 }).default("user").notNull(), // 'admin' | 'user'
    type: (0, mysql_core_1.varchar)("type", { length: 50 }).default("general").notNull(), // 'task_status' | 'online_days' | 'general'
    description: (0, mysql_core_1.varchar)("description", { length: 500 }).notNull(),
    link: (0, mysql_core_1.varchar)("link", { length: 255 }), // e.g. '/admin/tasks' or '/attendance'
    is_read: (0, mysql_core_1.boolean)("is_read").default(false),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
