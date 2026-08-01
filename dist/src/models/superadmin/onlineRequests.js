"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onlineRequests = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const users_1 = require("./users");
exports.onlineRequests = (0, mysql_core_1.mysqlTable)("online_requests", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    userId: (0, mysql_core_1.char)("user_id", { length: 36 }).references(() => users_1.users.id).notNull(),
    date: (0, mysql_core_1.date)("date").notNull(),
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "approve", "reject"]).default("pending"),
});
