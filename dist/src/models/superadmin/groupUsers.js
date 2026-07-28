"use strict";
// src/models/schema/groupUsers.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupUsers = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const users_1 = require("./users");
const projectGroups_1 = require("./projectGroups");
exports.groupUsers = (0, mysql_core_1.mysqlTable)("groupUsers", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    user_id: (0, mysql_core_1.char)("user_id", { length: 36 }).references(() => users_1.users.id, { onDelete: "cascade" }),
    group_id: (0, mysql_core_1.char)("group_id", { length: 36 }).references(() => projectGroups_1.projectGroups.id, { onDelete: "cascade" }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
