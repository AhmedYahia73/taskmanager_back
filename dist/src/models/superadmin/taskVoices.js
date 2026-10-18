"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskVoices = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const tasks_1 = require("./tasks");
const users_1 = require("./users");
exports.taskVoices = (0, mysql_core_1.mysqlTable)("task_voices", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    task_id: (0, mysql_core_1.char)("task_id", { length: 36 })
        .notNull()
        .references(() => tasks_1.tasks.id, { onDelete: "cascade" }),
    user_id: (0, mysql_core_1.char)("user_id", { length: 36 })
        .references(() => users_1.users.id, { onDelete: "set null" }),
    voice_url: (0, mysql_core_1.varchar)("voice_url", { length: 500 }).notNull(),
    duration: (0, mysql_core_1.int)("duration").default(0),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
