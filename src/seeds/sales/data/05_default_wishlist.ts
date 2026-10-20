// src/seeds/sales/data/05_default_wishlist.ts

import { salesDb } from "../../../models/sales/db";
import { wishList } from "../../../models/sales/schema";
import { Seed } from "../runner";
import { sql } from "drizzle-orm";
import { DEFAULT_SALES_PROJECT_ID } from "./06_default_sales_projects";

const seed: Seed = {
    name: "05_default_wishlist",

    async run() {
        console.log("   📝 Inserting rich set of default wishlist items...");

        const wishListData = [
            { 
                name: "إتاحة نظام الدفع والتقسيط على 12 شهر",
                description: "العميل يطلب توفير خيار التقسيط بدون فوائد بالتعاون مع بنوك مصرية كشرط أساسي لزيادة حجم الطلبيات في الربع القادم.",
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "لوحة تحكم (Dashboard) مخصصة لقادة الفرق",
                description: "توفير واجهة رسومية فورية لمتابعة أداء المناديب في الشارع لحظة بلحظة ومقارنة الإنجاز مع التارجت الفعلي.",
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "دعم فني متاح 24/7 طوال الأسبوع",
                description: "رغبة ملحة من كبار عملاء الصيدليات والمستشفيات للحصول على خط دعم ساخن لحالات الطوارئ خارج أوقات العمل الرسمية.",
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "توفير تطبيق جوال يعمل بالكامل بدون إنترنت (Offline Mode)",
                description: "تطبيق للمناديب يتيح تسجيل الزيارات وحفظ الموقع الجغرافي دون الحاجة لاتصال إنترنت مستمر، مع مزامنة البيانات تلقائياً فور توفر الشبكة.",
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "تكامل مع نظام الفواتير الإلكترونية (Zakat & Tax Integration)",
                description: "الشركات الكبرى تبدي رغبة في ربط برنامج الـ CRM والمبيعات بنظام مصلحة الضرائب لإنشاء الفواتير القانونية بضغطة زر.",
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "توفير كتالوج منتجات تفاعلي مع نماذج 3D",
                description: "رغبة من عملاء شركات الأثاث والتطوير العقاري لعرض المنتجات للزبائن بشكل تفاعلي ومبهر أثناء الزيارة الميدانية.",
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "تنبيهات وإشعارات عبر الواتساب تلقائياً (WhatsApp Automation)",
                description: "إرسال رسالة ترحيبية أو تفاصيل الفاتورة ومواعيد الزيارات للعميل بشكل تلقائي عبر الواتساب بمجرد تغيير حالة الزيارة إلى (Sales).",
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            },
            { 
                name: "توفير خصومات موسمية للعملاء الأوفياء",
                description: "صياغة نظام ولاء مدمج يمنح كود خصم تلقائي للعملاء الذين تخطى حجم تعاملهم التاريخي حاجز الـ 100 ألف جنيه.",
                sales_project_id: DEFAULT_SALES_PROJECT_ID,
            }
        ];

        console.log("   📥 Saving wishlist items...");
        await salesDb.insert(wishList).values(wishListData);

        console.log(`   🚀 Completed! Seeded ${wishListData.length} highly requested wishlist items.`);
    },

    async rollback() {
        console.log("   🗑️ Rolling back seeded wishlist items...");
        await salesDb.delete(wishList).where(
            sql`id LIKE 'w1111111%' OR id LIKE 'w2222222%' OR id LIKE 'w3333333%' OR id LIKE 'w4444444%' OR id LIKE 'w5555555%' OR id LIKE 'w6666666%' OR id LIKE 'w7777777%' OR id LIKE 'w8888888%'`
        );
        console.log("   ✅ Rollback completed successfully.");
    },
};

export default seed;
