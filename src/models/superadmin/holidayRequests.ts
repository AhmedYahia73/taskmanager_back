import {
  mysqlTable,
  mysqlEnum,
  char,
  date,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const holidayRequests = mysqlTable("holiday_requests", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: char("user_id", { length: 36 }).references(() => users.id).notNull(),
  date: date("date").notNull(),
  status: mysqlEnum("status", ["pending", "approve", "reject"]).default("pending"),
});
