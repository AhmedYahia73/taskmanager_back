"use strict";
// src/seeds/sales/data/02_default_targets.ts
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../../../models/sales/db");
const schema_1 = require("../../../models/sales/schema");
const drizzle_orm_1 = require("drizzle-orm");
const _06_default_sales_projects_1 = require("./06_default_sales_projects");
const seed = {
    name: "02_default_targets",
    async run() {
        console.log("   📝 Inserting rich set of default targets...");
        const targetsData = [
            // 🎯 أهداف المبيعات (Sales Targets) - مبالغ مالية أو صفقات مغلقة
            {
                name: "تارجت مبيعات الربع السنوي الأول (Q1)",
                type: "sales",
                sales_project_id: _06_default_sales_projects_1.DEFAULT_SALES_PROJECT_ID,
            },
            {
                name: "تارجت مبيعات الربع السنوي الثاني (Q2)",
                type: "sales",
                sales_project_id: _06_default_sales_projects_1.DEFAULT_SALES_PROJECT_ID,
            },
            {
                name: "تارجت مبيعات الموظفين المبتدئين شهرياً",
                type: "sales",
                sales_project_id: _06_default_sales_projects_1.DEFAULT_SALES_PROJECT_ID,
            },
            {
                name: "تارجت مبيعات كبار العملاء (VIP)",
                type: "sales",
                sales_project_id: _06_default_sales_projects_1.DEFAULT_SALES_PROJECT_ID,
            },
            // 🚗 أهداف الزيارات (Visits Targets) - عدد زيارات للعملاء على الأرض أو الاجتماعات
            {
                name: "تارجت زيارات المبيعات الخارجية الأسبوعي",
                type: "visit",
                sales_project_id: _06_default_sales_projects_1.DEFAULT_SALES_PROJECT_ID,
            },
            {
                name: "تارجت زيارات عملاء العقارات شهرياً",
                type: "visit",
                sales_project_id: _06_default_sales_projects_1.DEFAULT_SALES_PROJECT_ID,
            },
            {
                name: "تارجت اجتماعات الـ Zoom والـ Online اليومي",
                type: "visit",
                sales_project_id: _06_default_sales_projects_1.DEFAULT_SALES_PROJECT_ID,
            },
            {
                name: "تارجت زيارات المتابعة والدعم الفني",
                type: "visit",
                sales_project_id: _06_default_sales_projects_1.DEFAULT_SALES_PROJECT_ID,
            }
        ];
        console.log("   📥 Saving targets...");
        await db_1.salesDb.insert(schema_1.targets).values(targetsData);
        console.log(`   🚀 Completed! Seeded ${targetsData.length} diverse targets.`);
    },
    async rollback() {
        console.log("   🗑️ Rolling back seeded targets...");
        await db_1.salesDb.delete(schema_1.targets).where((0, drizzle_orm_1.sql) `id LIKE 't1111111%' OR id LIKE 't2222222%' OR id LIKE 't3333333%' OR id LIKE 't4444444%' OR id LIKE 't5555555%' OR id LIKE 't6666666%' OR id LIKE 't7777777%' OR id LIKE 't8888888%'`);
        console.log("   ✅ Rollback completed successfully.");
    },
};
exports.default = seed;
