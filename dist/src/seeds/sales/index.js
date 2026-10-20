"use strict";
// src/seeds/sales/index.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesSeeds = void 0;
const runner_1 = require("./runner");
const _06_default_sales_projects_1 = __importDefault(require("./data/06_default_sales_projects"));
const _02_default_targets_1 = __importDefault(require("./data/02_default_targets"));
const _01_admin_1 = __importDefault(require("./data/01_admin"));
const _04_default_visit_status_1 = __importDefault(require("./data/04_default_visit_status"));
const _03_default_visits_1 = __importDefault(require("./data/03_default_visits"));
const _05_default_wishlist_1 = __importDefault(require("./data/05_default_wishlist"));
exports.salesSeeds = [
    _06_default_sales_projects_1.default,
    _02_default_targets_1.default,
    _01_admin_1.default,
    _04_default_visit_status_1.default,
    _03_default_visits_1.default,
    _05_default_wishlist_1.default,
];
// Execute if run directly
if (require.main === module || process.argv[1]?.includes("seeds/sales")) {
    const isFresh = process.argv.includes("--fresh");
    (0, runner_1.runSeeds)(exports.salesSeeds, { fresh: isFresh })
        .then(() => {
        console.log("✅ Sales DB seeding completed successfully!");
        process.exit(0);
    })
        .catch((error) => {
        console.error("❌ Sales DB seeding failed:", error);
        process.exit(1);
    });
}
