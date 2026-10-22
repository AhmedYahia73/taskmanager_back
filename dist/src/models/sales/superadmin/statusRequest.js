"use strict";
// src/models/schema/statusRequest.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusRequest = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const users_1 = require("./users");
const visits_1 = require("./visits");
const salesProjects_1 = require("./salesProjects");
exports.statusRequest = (0, mysql_core_1.mysqlTable)("status_requests", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    sales_project_id: (0, mysql_core_1.char)("sales_project_id", { length: 36 }).references(() => salesProjects_1.salesProjects.id, { onDelete: "cascade" }),
    visitId: (0, mysql_core_1.char)("visit_id", { length: 36 })
        .notNull()
        .references(() => visits_1.visits.id, { onDelete: "cascade" }),
    userId: (0, mysql_core_1.char)("user_id", { length: 36 })
        .notNull()
        .references(() => users_1.users.id, { onDelete: "cascade" }),
    from: (0, mysql_core_1.mysqlEnum)("from", ["visit", "sales", "delivered"]).notNull(),
    to: (0, mysql_core_1.mysqlEnum)("to", ["visit", "sales", "delivered"]).notNull(),
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "approve", "reject"]).default("pending").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
