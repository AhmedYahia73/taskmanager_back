"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissions = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const users_1 = require("./users");
exports.permissions = (0, mysql_core_1.mysqlTable)("permissions", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    userId: (0, mysql_core_1.char)("user_id", { length: 36 }).references(() => users_1.users.id).notNull(),
    date: (0, mysql_core_1.datetime)("date").notNull(),
    hours: (0, mysql_core_1.double)("hours").notNull(),
    reason: (0, mysql_core_1.varchar)("reason", { length: 255 }),
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "approve", "reject"]).default("pending").notNull(),
    createdAt: (0, mysql_core_1.datetime)("created_at").default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
});
