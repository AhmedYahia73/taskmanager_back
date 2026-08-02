"use strict";
// src/models/schema/zones.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.shifts = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const zones_1 = require("./zones");
exports.shifts = (0, mysql_core_1.mysqlTable)("shifts", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    name: (0, mysql_core_1.varchar)("name", { length: 200 }).notNull(),
    zone_id: (0, mysql_core_1.char)("zone_id", { length: 36 }).references(() => zones_1.zones.id, { onDelete: "cascade" }),
    from: (0, mysql_core_1.datetime)("from").notNull(),
    to: (0, mysql_core_1.datetime)("to").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
