import { salesDb, salesPool } from "../../models/sales/db";
import { sql } from "drizzle-orm";

export interface Seed {
    name: string;
    run: () => Promise<void>;
    rollback?: () => Promise<void>;
}

interface SeedOptions {
    fresh?: boolean;
}

// Create seed_history table if it doesn't exist in Sales DB
async function ensureSeedHistoryTable(): Promise<void> {
    await salesDb.execute(sql`
    CREATE TABLE IF NOT EXISTS seed_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Get list of already executed seeds
async function getExecutedSeeds(): Promise<string[]> {
    const result = await salesDb.execute(sql`SELECT name FROM seed_history`);
    const rows = result[0] as unknown as { name: string }[];
    return rows.map((row) => row.name);
}

// Mark a seed as executed
async function markSeedAsExecuted(name: string): Promise<void> {
    await salesDb.execute(sql`INSERT INTO seed_history (name) VALUES (${name})`);
}

// Clear seed history (for fresh seeding)
async function clearSeedHistory(): Promise<void> {
    await salesDb.execute(sql`DELETE FROM seed_history`);
}

// Run all pending seeds
export async function runSeeds(
    seeds: Seed[],
    options: SeedOptions = {}
): Promise<void> {
    const { fresh = false } = options;

    console.log("🌱 Starting Sales database seeding...\n");

    try {
        await ensureSeedHistoryTable();

        if (fresh) {
            console.log("🔄 Fresh mode enabled - clearing seed history...\n");
            await clearSeedHistory();
        }

        const executedSeeds = await getExecutedSeeds();

        const pendingSeeds = seeds.filter(
            (seed) => !executedSeeds.includes(seed.name)
        );

        if (pendingSeeds.length === 0) {
            console.log("✨ All Sales seeds have already been executed. Nothing to do.\n");
            return;
        }

        console.log(`📋 Found ${pendingSeeds.length} pending Sales seed(s) to run:\n`);
        pendingSeeds.forEach((seed, index) => {
            console.log(`   ${index + 1}. ${seed.name}`);
        });
        console.log("");

        for (const seed of pendingSeeds) {
            console.log(`▶️  Running Sales seed: ${seed.name}...`);

            try {
                await seed.run();
                await markSeedAsExecuted(seed.name);
                console.log(`   ✅ ${seed.name} completed\n`);
            } catch (error) {
                console.error(`   ❌ ${seed.name} failed:`, error);
                throw error;
            }
        }

        console.log("🎉 All Sales seeds executed successfully!\n");
    } finally {
        await salesPool.end();
    }
}

// Rollback seeds (optional utility)
export async function rollbackSeeds(seeds: Seed[]): Promise<void> {
    console.log("⏪ Rolling back Sales seeds...\n");

    try {
        await ensureSeedHistoryTable();

        for (const seed of [...seeds].reverse()) {
            if (seed.rollback) {
                console.log(`⏪ Rolling back: ${seed.name}...`);
                try {
                    await seed.rollback();
                    await salesDb.execute(
                        sql`DELETE FROM seed_history WHERE name = ${seed.name}`
                    );
                    console.log(`   ✅ ${seed.name} rolled back\n`);
                } catch (error) {
                    console.error(`   ❌ ${seed.name} rollback failed:`, error);
                    throw error;
                }
            }
        }

        console.log("✅ Rollback completed!\n");
    } finally {
        await salesPool.end();
    }
}
