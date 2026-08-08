"use strict";
// src/models/schema/companies.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.companies = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
// تم إزالة الاستيرادات غير المستخدمة (users, projectGroups, projects)
exports.companies = (0, mysql_core_1.mysqlTable)("companies", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    name: (0, mysql_core_1.varchar)("name", { length: 200 }).notNull(),
    owner_name: (0, mysql_core_1.varchar)("owner_name", { length: 200 }),
    address: (0, mysql_core_1.varchar)("address", { length: 400 }),
    phone: (0, mysql_core_1.varchar)("phone", { length: 44 }),
    whatts: (0, mysql_core_1.varchar)("whatts", { length: 100 }),
    facebook: (0, mysql_core_1.varchar)("facebook", { length: 200 }),
    instgram: (0, mysql_core_1.varchar)("instgram", { length: 200 }),
    logo: (0, mysql_core_1.varchar)("logo", { length: 200 }).notNull(),
    email: (0, mysql_core_1.varchar)("email", { length: 100 }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
