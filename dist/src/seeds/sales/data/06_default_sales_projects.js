"use strict";
// src/seeds/sales/data/06_default_sales_projects.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.SECOND_SALES_PROJECT_ID = exports.DEFAULT_SALES_PROJECT_ID = void 0;
const db_1 = require("../../../models/sales/db");
const schema_1 = require("../../../models/sales/schema");
const drizzle_orm_1 = require("drizzle-orm");
exports.DEFAULT_SALES_PROJECT_ID = "p1111111-1111-1111-1111-111111111111";
exports.SECOND_SALES_PROJECT_ID = "p2222222-2222-2222-2222-222222222222";
const seed = {
    name: "00_default_sales_projects",
    async run() {
        console.log("   📝 Inserting default sales projects...");
        const salesProjectsData = [
            {
                id: exports.DEFAULT_SALES_PROJECT_ID,
                name: "مشروع ويجو ستيشن (WeGoStation CRM)",
                logo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60",
                design: "design 1",
            },
            {
                id: exports.SECOND_SALES_PROJECT_ID,
                name: "مشروع ستيجو للمبيعات (Systigo Sales Hub)",
                logo: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&auto=format&fit=crop&q=60",
                design: "design 2",
            },
        ];
        console.log("   📥 Saving default sales projects...");
        await db_1.salesDb.insert(schema_1.salesProjects).values(salesProjectsData);
        console.log("   🚀 Completed! Seeded 2 default sales projects.");
    },
    async rollback() {
        console.log("   🗑️ Rolling back seeded sales projects...");
        await db_1.salesDb.delete(schema_1.salesProjects).where((0, drizzle_orm_1.sql) `id IN (${exports.DEFAULT_SALES_PROJECT_ID}, ${exports.SECOND_SALES_PROJECT_ID})`);
        console.log("   ✅ Rollback completed successfully.");
    },
};
exports.default = seed;
