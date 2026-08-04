import {
  mysqlTable,
  char,
  mysqlEnum,
  timestamp,
  int,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { double } from "drizzle-orm/mysql-core";

export const bonuses = mysqlTable("bonuses", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: char("user_id", { length: 36 }).references(() => users.id).notNull(),
  type: mysqlEnum("type", ["days", "amount"]).default("amount"),
  amount: double("amount").notNull(),
  month: int("month").notNull(),
  year: int("year").notNull(),
    
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
