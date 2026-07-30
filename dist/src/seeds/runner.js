"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSeeds = runSeeds;
exports.rollbackSeeds = rollbackSeeds;
const db_1 = require("../models/db");
const drizzle_orm_1 = require("drizzle-orm");
// Create seed_history table if it doesn't exist
async function ensureSeedHistoryTable() {
    await db_1.db.execute((0, drizzle_orm_1.sql) `
    CREATE TABLE IF NOT EXISTS seed_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
// Get list of already executed seeds
async function getExecutedSeeds() {
    const result = await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT name FROM seed_history`);
    const rows = result[0];
    return rows.map((row) => row.name);
}
// Mark a seed as executed
async function markSeedAsExecuted(name) {
    await db_1.db.execute((0, drizzle_orm_1.sql) `INSERT INTO seed_history (name) VALUES (${name})`);
}
// Clear seed history (for fresh seeding)
async function clearSeedHistory() {
    await db_1.db.execute((0, drizzle_orm_1.sql) `DELETE FROM seed_history`);
}
// Run all pending seeds
async function runSeeds(seeds, options = {}) {
    const { fresh = false } = options;
    console.log("🌱 Starting database seeding...\n");
    try {
        // Ensure seed_history table exists
        await ensureSeedHistoryTable();
        if (fresh) {
            console.log("🔄 Fresh mode enabled - clearing existing data...\n");
            // Rollback in reverse order to respect foreign key constraints
            for (const seed of [...seeds].reverse()) {
                if (seed.rollback) {
                    try {
                        await seed.rollback();
                    }
                    catch (e) {
                        console.error(`   ⚠️ Failed to rollback ${seed.name}:`, e);
                    }
                }
            }
            await clearSeedHistory();
        }
        // Get already executed seeds
        const executedSeeds = await getExecutedSeeds();
        // Filter out already executed seeds
        const pendingSeeds = seeds.filter((seed) => !executedSeeds.includes(seed.name));
        if (pendingSeeds.length === 0) {
            console.log("✨ All seeds have already been executed. Nothing to do.\n");
            return;
        }
        console.log(`📋 Found ${pendingSeeds.length} pending seed(s) to run:\n`);
        pendingSeeds.forEach((seed, index) => {
            console.log(`   ${index + 1}. ${seed.name}`);
        });
        console.log("");
        // Execute each pending seed
        for (const seed of pendingSeeds) {
            console.log(`▶️  Running seed: ${seed.name}...`);
            try {
                await seed.run();
                await markSeedAsExecuted(seed.name);
                console.log(`   ✅ ${seed.name} completed\n`);
            }
            catch (error) {
                console.error(`   ❌ ${seed.name} failed:`, error);
                throw error;
            }
        }
        console.log("🎉 All seeds executed successfully!\n");
    }
    finally {
        // Close the database connection pool
        await db_1.pool.end();
    }
}
// Rollback seeds (optional utility)
async function rollbackSeeds(seeds) {
    console.log("⏪ Rolling back seeds...\n");
    try {
        await ensureSeedHistoryTable();
        // Rollback in reverse order
        for (const seed of [...seeds].reverse()) {
            if (seed.rollback) {
                console.log(`⏪ Rolling back: ${seed.name}...`);
                try {
                    await seed.rollback();
                    await db_1.db.execute((0, drizzle_orm_1.sql) `DELETE FROM seed_history WHERE name = ${seed.name}`);
                    console.log(`   ✅ ${seed.name} rolled back\n`);
                }
                catch (error) {
                    console.error(`   ❌ ${seed.name} rollback failed:`, error);
                    throw error;
                }
            }
        }
        console.log("✅ Rollback completed!\n");
    }
    finally {
        await db_1.pool.end();
    }
}
