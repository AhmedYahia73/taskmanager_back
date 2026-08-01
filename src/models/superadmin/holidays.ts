import {
  mysqlTable,
  mysqlEnum,
  char,
  json,
  int,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const holidays = mysqlTable("holidays", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  type: mysqlEnum("type", ["fixed", "number"]).notNull(),
  days: json("days").notNull(),
  workNum: int("work_num").default(0),
  holidaysNum: int("holidays_num").default(0),
});
