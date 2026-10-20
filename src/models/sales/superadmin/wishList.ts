import { boolean, date, int, mysqlTable, timestamp, varchar, char } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm"; 
import { mysqlEnum } from "drizzle-orm/mysql-core";
import { users } from "./users";
import { salesProjects } from "./salesProjects";

export const wishList = mysqlTable("wishList", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    sales_project_id: char("sales_project_id", { length: 36 }).references(() => salesProjects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    description: varchar("description", { length: 1000 }),
    sales_id: char("sales_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
