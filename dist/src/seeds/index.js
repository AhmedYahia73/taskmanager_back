"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seeds = void 0;
const runner_1 = require("./runner");
const _01_initial_data_1 = require("./data/01_initial_data");
const _02_hrm_data_1 = require("./data/02_hrm_data");
exports.seeds = [
    _01_initial_data_1.initialDataSeed,
    _02_hrm_data_1.hrmDataSeed
];
// Execute if run directly
if (require.main === module || process.argv[1]?.includes("seeds/index.ts")) {
    const fresh = process.argv.includes("--fresh");
    (0, runner_1.runSeeds)(exports.seeds, { fresh })
        .then(() => process.exit(0))
        .catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
