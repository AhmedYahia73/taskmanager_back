"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.holidays = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.holidays = (0, mysql_core_1.mysqlTable)("holidays", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    type: (0, mysql_core_1.mysqlEnum)("type", ["fixed", "number"]).notNull(),
    days: (0, mysql_core_1.json)("days").notNull(),
    workNum: (0, mysql_core_1.int)("work_num").default(0),
    holidaysNum: (0, mysql_core_1.int)("holidays_num").default(0),
});
