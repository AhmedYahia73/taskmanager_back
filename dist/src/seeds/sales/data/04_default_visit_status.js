"use strict";
// src/seeds/sales/data/04_default_visit_status.ts
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../../../models/sales/db");
const schema_1 = require("../../../models/sales/schema");
const drizzle_orm_1 = require("drizzle-orm");
const _06_default_sales_projects_1 = require("./06_default_sales_projects");
const seed = {
    name: "04_default_visit_status",
    async run() {
        console.log("   📝 Inserting comprehensive default visit statuses...");
        const visitStatusesData = [
            {
                name: "قيد الانتظار / المتابعة (Pending)",
                status: true,
                sales_project_id: _06_default_sales_projects_1.DEFAULT_SALES_PROJECT_ID,
            },
            {
                name: "مهتم بالتعاقد (Interested / Lead)",
                status: true,
                sales_project_id: _06_default_sales_projects_1.DEFAULT_SALES_PROJECT_ID,
            },
            {
                name: "تمت العملية بنجاح (Closed Won)",
                status: true,
                sales_project_id: _06_default_sales_projects_1.DEFAULT_SALES_PROJECT_ID,
            },
            {
                name: "غير مهتم حالياً (Not Interested)",
                status: true,
                sales_project_id: _06_default_sales_projects_1.DEFAULT_SALES_PROJECT_ID,
            },
            {
                name: "مؤجل لعدم التواجد (Postponed)",
                status: true,
                sales_project_id: _06_default_sales_projects_1.DEFAULT_SALES_PROJECT_ID,
            },
            {
                name: "العنوان غير صحيح / وهمي (Invalid Location)",
                status: true,
                sales_project_id: _06_default_sales_projects_1.DEFAULT_SALES_PROJECT_ID,
            },
            {
                name: "ملغي من قِبل الإدارة (Canceled)",
                status: true,
                sales_project_id: _06_default_sales_projects_1.DEFAULT_SALES_PROJECT_ID,
            }
        ];
        console.log("   📥 Saving visit statuses...");
        await db_1.salesDb.insert(schema_1.visitStatus).values(visitStatusesData);
        console.log(`   🚀 Completed! Seeded ${visitStatusesData.length} visit statuses.`);
    },
    async rollback() {
        console.log("   🗑️ Rolling back seeded visit statuses...");
        await db_1.salesDb.delete(schema_1.visitStatus).where((0, drizzle_orm_1.sql) `id LIKE 'st111111%' OR id LIKE 'st222222%' OR id LIKE 'st333333%' OR id LIKE 'st444444%' OR id LIKE 'st555555%' OR id LIKE 'st666666%' OR id LIKE 'st777777%'`);
        console.log("   ✅ Rollback completed successfully.");
    },
};
exports.default = seed;
