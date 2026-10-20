import { boolean, date, int, mysqlTable, timestamp, varchar, char } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm"; 
import { mysqlEnum } from "drizzle-orm/mysql-core";
import { salesProjects } from "./salesProjects";

export const visitStatus = mysqlTable("visitStatus", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    sales_project_id: char("sales_project_id", { length: 36 }).references(() => salesProjects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    status: boolean("status").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
