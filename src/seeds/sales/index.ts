// src/seeds/sales/index.ts

import { Seed, runSeeds } from "./runner";
import salesProjectsSeeder from "./data/06_default_sales_projects";
import targetsSeeder from "./data/02_default_targets";
import adminSeeder from "./data/01_admin";
import statusSeeder from "./data/04_default_visit_status";
import visitsSeeder from "./data/03_default_visits";
import wishListSeeder from "./data/05_default_wishlist";

export const salesSeeds: Seed[] = [
    salesProjectsSeeder,
    targetsSeeder,
    adminSeeder,
    statusSeeder,
    visitsSeeder,
    wishListSeeder,
];

// Execute if run directly
if (require.main === module || process.argv[1]?.includes("seeds/sales")) {
    const isFresh = process.argv.includes("--fresh");
    runSeeds(salesSeeds, { fresh: isFresh })
        .then(() => {
            console.log("✅ Sales DB seeding completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Sales DB seeding failed:", error);
            process.exit(1);
        });
}
