// src/seeds/sales/data/02_default_targets.ts

import { salesDb } from "../../../models/sales/db";
import { targets } from "../../../models/sales/schema";
import { Seed } from "../runner";
import { sql } from "drizzle-orm";
import { DEFAULT_SALES_PROJECT_ID } from "./06_default_sales_projects";

const seed: Seed = {
    name: "02_default_targets",

    async run() {
        console.log("   📝 Inserting rich set of default targets...");

        const targetsData = [
            // 🎯 أهداف المبيعات (Sales Targets) - مبالغ مالية أو صفقات مغلقة
            { 
                name: "تارجت مبيعات الربع السنوي الأول (Q1)",
                type: "sales" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "تارجت مبيعات الربع السنوي الثاني (Q2)",
                type: "sales" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "تارجت مبيعات الموظفين المبتدئين شهرياً",
                type: "sales" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "تارجت مبيعات كبار العملاء (VIP)",
                type: "sales" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },

            // 🚗 أهداف الزيارات (Visits Targets) - عدد زيارات للعملاء على الأرض أو الاجتماعات
            { 
                name: "تارجت زيارات المبيعات الخارجية الأسبوعي",
                type: "visit" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "تارجت زيارات عملاء العقارات شهرياً",
                type: "visit" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "تارجت اجتماعات الـ Zoom والـ Online اليومي",
                type: "visit" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "تارجت زيارات المتابعة والدعم الفني",
                type: "visit" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            }
        ];

        console.log("   📥 Saving targets...");
        await salesDb.insert(targets).values(targetsData);

        console.log(`   🚀 Completed! Seeded ${targetsData.length} diverse targets.`);
    },

    async rollback() {
        console.log("   🗑️ Rolling back seeded targets...");
        await salesDb.delete(targets).where(
            sql`id LIKE 't1111111%' OR id LIKE 't2222222%' OR id LIKE 't3333333%' OR id LIKE 't4444444%' OR id LIKE 't5555555%' OR id LIKE 't6666666%' OR id LIKE 't7777777%' OR id LIKE 't8888888%'`
        );
        console.log("   ✅ Rollback completed successfully.");
    },
};

export default seed;
