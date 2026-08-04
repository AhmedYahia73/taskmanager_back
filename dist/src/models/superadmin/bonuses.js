"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bonuses = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const users_1 = require("./users");
const mysql_core_2 = require("drizzle-orm/mysql-core");
exports.bonuses = (0, mysql_core_1.mysqlTable)("bonuses", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    userId: (0, mysql_core_1.char)("user_id", { length: 36 }).references(() => users_1.users.id).notNull(),
    type: (0, mysql_core_1.mysqlEnum)("type", ["days", "amount"]).default("amount"),
    amount: (0, mysql_core_2.double)("amount").notNull(),
    month: (0, mysql_core_1.int)("month").notNull(),
    year: (0, mysql_core_1.int)("year").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
