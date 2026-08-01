import {
  mysqlTable,
  mysqlEnum,
  char,
  datetime,
  double,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const permissions = mysqlTable("permissions", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: char("user_id", { length: 36 }).references(() => users.id).notNull(),
  date: datetime("date").notNull(),
  hours: double("hours").notNull(),
  reason: varchar("reason", { length: 255 }),
  status: mysqlEnum("status", ["pending", "approve", "reject"]).default("pending").notNull(),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
});
