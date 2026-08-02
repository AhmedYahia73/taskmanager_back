"use strict";
// src/models/schema/users.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const zones_1 = require("./zones");
const shifts_1 = require("./shifts");
exports.users = (0, mysql_core_1.mysqlTable)("users", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    name: (0, mysql_core_1.varchar)("name", { length: 200 }).notNull(),
    email: (0, mysql_core_1.varchar)("email", { length: 100 }).notNull().unique(),
    phone: (0, mysql_core_1.varchar)("phone", { length: 20 }).notNull().unique(),
    image: (0, mysql_core_1.varchar)("image", { length: 200 }),
    password: (0, mysql_core_1.varchar)("password", { length: 255 }).notNull(),
    status: (0, mysql_core_1.mysqlEnum)("status", ["active", "inactive"]).default("active"),
    role: (0, mysql_core_1.mysqlEnum)("role", ["super_admin", "admin", "tester", "engineer"]).notNull().default("engineer"),
    points: (0, mysql_core_1.int)("points").default(0),
    yearly_holidays: (0, mysql_core_1.boolean)("yearly_holidays").default(false),
    zone_id: (0, mysql_core_1.char)("zone_id", { length: 36 }).references(() => zones_1.zones.id, { onDelete: "cascade" }),
    shift_id: (0, mysql_core_1.char)("shift_id", { length: 36 }).references(() => shifts_1.shifts.id, { onDelete: "cascade" }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
