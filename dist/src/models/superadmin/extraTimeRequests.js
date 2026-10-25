"use strict";
// src/models/superadmin/extraTimeRequests.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.extraTimeRequests = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const users_1 = require("./users");
exports.extraTimeRequests = (0, mysql_core_1.mysqlTable)("extra_time_requests", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    userId: (0, mysql_core_1.char)("user_id", { length: 36 })
        .references(() => users_1.users.id, { onDelete: "cascade" })
        .notNull(),
    date: (0, mysql_core_1.date)("date").notNull(),
    early_attend: (0, mysql_core_1.boolean)("early_attend").default(false).notNull(),
    late_leave: (0, mysql_core_1.boolean)("late_leave").default(false).notNull(),
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "approve", "reject"])
        .default("pending")
        .notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
