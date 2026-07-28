// src/models/schema/groupUsers.ts

import {
  mysqlTable,
  timestamp,
  char
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./users"; 
import { projectGroups } from "./projectGroups"; 

export const groupUsers = mysqlTable("groupUsers", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  user_id: char("user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }),
  group_id: char("group_id", { length: 36 }).references(() => projectGroups.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});