"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visitStatus = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const salesProjects_1 = require("./salesProjects");
exports.visitStatus = (0, mysql_core_1.mysqlTable)("visitStatus", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    sales_project_id: (0, mysql_core_1.char)("sales_project_id", { length: 36 }).references(() => salesProjects_1.salesProjects.id, { onDelete: "cascade" }),
    name: (0, mysql_core_1.varchar)("name", { length: 100 }).notNull(),
    status: (0, mysql_core_1.boolean)("status").notNull().default(true),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
