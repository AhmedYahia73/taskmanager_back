import {
  mysqlTable,
  varchar,
  timestamp,
  char,
  int,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { tasks } from "./tasks";
import { users } from "./users";

export const taskVoices = mysqlTable("task_voices", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  task_id: char("task_id", { length: 36 })
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  user_id: char("user_id", { length: 36 })
    .references(() => users.id, { onDelete: "set null" }),
  voice_url: varchar("voice_url", { length: 500 }).notNull(),
  duration: int("duration").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
