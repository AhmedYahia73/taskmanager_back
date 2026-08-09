// src/models/schema/notesBoard.ts

import {
  mysqlTable,
  varchar,
  timestamp,
  mysqlEnum,
  char,
  date,
  int,
  boolean,
  text // أضفنا text في حال أردت استخدامه للنصوص الطويلة
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { projectGroups } from "./projectGroups";


export const notesBoard = mysqlTable("notesBoard", {
  id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  user_id: char("user_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  group_id: char("group_id", { length: 36 }).references(() => projectGroups.id, { onDelete: "cascade" }),
  notes: text("notes").notNull(), 
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});