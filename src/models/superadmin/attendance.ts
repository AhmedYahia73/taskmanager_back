import {
  mysqlTable,
  char,
  datetime,
  boolean,
  real,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { double } from "drizzle-orm/mysql-core";

export const attendance = mysqlTable("attendance", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: char("user_id", { length: 36 }).references(() => users.id).notNull(),
  from: datetime("from").notNull(),
  to: datetime("to"),
  onsite: boolean("onsite").notNull(),
  departureOnsite: boolean("departureOnsite").default(false),
  isRequestOnline: boolean("is_request_online").default(false),
  hours: real("hours").default(0),
  delay: double("delay").default(0),
  over_time: double("over_time").default(0),
});
