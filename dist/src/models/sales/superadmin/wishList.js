"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wishList = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const users_1 = require("./users");
const salesProjects_1 = require("./salesProjects");
exports.wishList = (0, mysql_core_1.mysqlTable)("wishList", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    sales_project_id: (0, mysql_core_1.char)("sales_project_id", { length: 36 }).references(() => salesProjects_1.salesProjects.id, { onDelete: "cascade" }),
    name: (0, mysql_core_1.varchar)("name", { length: 100 }).notNull(),
    description: (0, mysql_core_1.varchar)("description", { length: 1000 }),
    sales_id: (0, mysql_core_1.char)("sales_id", { length: 36 }).references(() => users_1.users.id, { onDelete: "set null" }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
