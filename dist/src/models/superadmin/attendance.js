"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendance = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const users_1 = require("./users");
const mysql_core_2 = require("drizzle-orm/mysql-core");
exports.attendance = (0, mysql_core_1.mysqlTable)("attendance", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    userId: (0, mysql_core_1.char)("user_id", { length: 36 }).references(() => users_1.users.id).notNull(),
    from: (0, mysql_core_1.datetime)("from").notNull(),
    to: (0, mysql_core_1.datetime)("to"),
    onsite: (0, mysql_core_1.boolean)("onsite").notNull(),
    departureOnsite: (0, mysql_core_1.boolean)("departureOnsite").default(false),
    isRequestOnline: (0, mysql_core_1.boolean)("is_request_online").default(false),
    hours: (0, mysql_core_1.real)("hours").default(0),
    delay: (0, mysql_core_2.double)("delay").default(0),
    over_time: (0, mysql_core_2.double)("over_time").default(0),
});
