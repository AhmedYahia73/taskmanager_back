// src/seeds/sales/data/06_default_sales_projects.ts

import { salesDb } from "../../../models/sales/db";
import { salesProjects } from "../../../models/sales/schema";
import { Seed } from "../runner";
import { sql } from "drizzle-orm";

export const DEFAULT_SALES_PROJECT_ID = "p1111111-1111-1111-1111-111111111111";
export const SECOND_SALES_PROJECT_ID = "p2222222-2222-2222-2222-222222222222";

const seed: Seed = {
    name: "00_default_sales_projects",

    async run() {
        console.log("   📝 Inserting default sales projects...");

        const salesProjectsData = [
            {
                id: DEFAULT_SALES_PROJECT_ID,
                name: "مشروع ويجو ستيشن (WeGoStation CRM)",
                logo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60",
                design: "design 1",
            },
            {
                id: SECOND_SALES_PROJECT_ID,
                name: "مشروع ستيجو للمبيعات (Systigo Sales Hub)",
                logo: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&auto=format&fit=crop&q=60",
                design: "design 2",
            },
        ];

        console.log("   📥 Saving default sales projects...");
        await salesDb.insert(salesProjects).values(salesProjectsData);
        console.log("   🚀 Completed! Seeded 2 default sales projects.");
    },

    async rollback() {
        console.log("   🗑️ Rolling back seeded sales projects...");
        await salesDb.delete(salesProjects).where(
            sql`id IN (${DEFAULT_SALES_PROJECT_ID}, ${SECOND_SALES_PROJECT_ID})`
        );
        console.log("   ✅ Rollback completed successfully.");
    },
};

export default seed;
