// src/seeds/sales/data/01_admin.ts

import { salesDb } from "../../../models/sales/db";
import { users } from "../../../models/sales/schema";
import { Seed } from "../runner";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import { DEFAULT_SALES_PROJECT_ID } from "./06_default_sales_projects";

const seed: Seed = {
    name: "01_admin",

    async run() {
        console.log("   📝 Inserting rich set of default users (Admins, Leaders, Sales)...");

        // كلمة مرور افتراضية موحدة لكل الحسابات للتجربة السهلة
        const defaultPassword = await bcrypt.hash("password123", 10);

        // معرفات ثابتة (UUIDs) للقادة لتسهيل عملية الربط بـ Sales
        const leader1Id = "11111111-1111-1111-1111-111111111111";
        const leader2Id = "22222222-2222-2222-2222-222222222222";
        const leader3Id = "33333333-3333-3333-3333-333333333333";

        // 1. إدخال الـ Admins (المدراء)
        const adminsData = [
            { 
                name: "أحمد العشري (مدير النظام)",
                email: "admin1@crm.com",
                phone: "+201011111111",
                password: defaultPassword,
                role: "admin" as const,
                status: "active" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "منى محمود (إدارة العمليات)",
                email: "admin2@crm.com",
                phone: "+201022222222",
                password: defaultPassword,
                role: "admin" as const,
                status: "active" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            }
        ];

        // 2. إدخال الـ Leaders (قادة الفرق)
        const leadersData = [
            { 
                name: "كريم خالد (قائد فريق القاهرة)",
                email: "karim.leader@crm.com",
                phone: "+201033333333",
                password: defaultPassword,
                role: "leader" as const,
                status: "active" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "ياسمين تامر (قائدة فريق الإسكندرية)",
                email: "yasmin.leader@crm.com",
                phone: "+201044444444",
                password: defaultPassword,
                role: "leader" as const,
                status: "active" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "مصطفى هلال (قائد المبيعات الخارجية)",
                email: "mostafa.leader@crm.com",
                phone: "+201055555555",
                password: defaultPassword,
                role: "leader" as const,
                status: "active" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            }
        ];

        // 3. إدخال الـ Sales (موظفي المبيعات) وتوزيعهم بالتساوي على القادة
        const salesData = [
            // 👥 مبيعات تابعين للقائد الأول (كريم)
            { 
                name: "عمر شريف",
                email: "omar.sales@crm.com",
                phone: "+201066666661",
                password: defaultPassword,
                role: "sales" as const,
                leader_id: leader1Id,
                status: "active" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "نهى فريد",
                email: "noha.sales@crm.com",
                phone: "+201066666662",
                password: defaultPassword,
                role: "sales" as const,
                leader_id: leader1Id,
                status: "active" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "زياد طارق",
                email: "ziad.sales@crm.com",
                phone: "+201066666663",
                password: defaultPassword,
                role: "sales" as const,
                leader_id: leader1Id,
                status: "inactive" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },

            // 👥 مبيعات تابعين للقائد الثاني (ياسمين)
            { 
                name: "سارة سليمان",
                email: "sarah.sales@crm.com",
                phone: "+201077777771",
                password: defaultPassword,
                role: "sales" as const,
                leader_id: leader2Id,
                status: "active" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "مروان أمين",
                email: "marwan.sales@crm.com",
                phone: "+201077777772",
                password: defaultPassword,
                role: "sales" as const,
                leader_id: leader2Id,
                status: "active" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "دينا رامي",
                email: "dina.sales@crm.com",
                phone: "+201077777773",
                password: defaultPassword,
                role: "sales" as const,
                leader_id: leader2Id,
                status: "active" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },

            // 👥 مبيعات تابعين للقائد الثالث (مصطفى)
            { 
                name: "خالد منصور",
                email: "khaled.sales@crm.com",
                phone: "+201088888881",
                password: defaultPassword,
                role: "sales" as const,
                leader_id: leader3Id,
                status: "active" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "ميادة حسن",
                email: "mayada.sales@crm.com",
                phone: "+201088888882",
                password: defaultPassword,
                role: "sales" as const,
                leader_id: leader3Id,
                status: "active" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "هاني يوسف",
                email: "hani.sales@crm.com",
                phone: "+201088888883",
                password: defaultPassword,
                role: "sales" as const,
                leader_id: leader3Id,
                status: "active" as const,
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            }
        ];

        // تنفيذ عملية الإدخال دفعة واحدة بالترتيب السليم للعلاقات (Admins ثم Leaders ثم Sales)
        console.log("   📥 Saving Admins...");
        await salesDb.insert(users).values(adminsData);

        console.log("   📥 Saving Leaders...");
        await salesDb.insert(users).values(leadersData);

        console.log("   📥 Saving Sales...");
        await salesDb.insert(users).values(salesData);

        console.log(`   🚀 Completed! Seeded 2 Admins, 3 Leaders, and 9 Sales.`);
    },

    async rollback() {
        console.log("   🗑️ Rolling back seeded users...");
        await salesDb.delete(users).where(
            sql`id LIKE 'a000000%' OR id IN (${sql.placeholder("l1")}, ${sql.placeholder("l2")}, ${sql.placeholder("l3")}) OR id LIKE 's100000%' OR id LIKE 's200000%' OR id LIKE 's300000%'`,
        ).execute({
            l1: "11111111-1111-1111-1111-111111111111",
            l2: "22222222-2222-2222-2222-222222222222",
            l3: "33333333-3333-3333-3333-333333333333"
        });
        console.log("   ✅ Rollback completed successfully.");
    },
};

export default seed;
