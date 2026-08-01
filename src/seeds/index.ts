import { Seed, runSeeds } from "./runner";
import { initialDataSeed } from "./data/01_initial_data";
import { hrmDataSeed } from "./data/02_hrm_data";

export const seeds: Seed[] = [
    initialDataSeed,
    hrmDataSeed
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
