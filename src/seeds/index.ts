import { Seed, runSeeds } from "./runner";
import { initialDataSeed } from "./data/01_initial_data";

export const seeds: Seed[] = [
    initialDataSeed,
];

// Execute if run directly
if (require.main === module || process.argv[1]?.includes("seeds/index.ts")) {
    const fresh = process.argv.includes("--fresh");
    runSeeds(seeds, { fresh })
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}
