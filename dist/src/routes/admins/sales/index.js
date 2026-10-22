"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_1 = __importDefault(require("./dashboard"));
const visits_1 = __importDefault(require("./visits"));
const leads_1 = __importDefault(require("./leads"));
const products_1 = __importDefault(require("./products"));
const target_1 = __importDefault(require("./target"));
const status_1 = __importDefault(require("./status"));
const requests_1 = __importDefault(require("./requests"));
const wishList_1 = __importDefault(require("./wishList"));
const salesProjects_1 = __importDefault(require("../salesProjects"));
const salesAdmin_1 = __importDefault(require("../salesAdmin"));
const salesLeader_1 = __importDefault(require("../salesLeader"));
const salesReps_1 = __importDefault(require("../salesReps"));
const checkpermission_1 = require("../../../middlewares/checkpermission");
const route = (0, express_1.Router)();
// 📁 Sales Projects Directory under /sales
route.use("/projects", salesProjects_1.default);
route.use("/sales-projects", salesProjects_1.default);
// 👥 Sales Team Roles under /sales
route.use("/admin", (0, checkpermission_1.checkAdmin)(), salesAdmin_1.default);
route.use("/admins", (0, checkpermission_1.checkAdmin)(), salesAdmin_1.default);
route.use("/leader", (0, checkpermission_1.checkAdmin)(), salesLeader_1.default);
route.use("/leaders", (0, checkpermission_1.checkAdmin)(), salesLeader_1.default);
route.use("/sales", (0, checkpermission_1.checkAdminLeader)(), salesReps_1.default);
// 📊 Sales Workspace Modules
route.use("/dashboard", dashboard_1.default);
route.use("/visits", visits_1.default);
route.use("/leads", leads_1.default);
route.use("/products", products_1.default);
route.use("/target", target_1.default);
route.use("/targets", target_1.default);
route.use("/visit_status", status_1.default);
route.use("/visitstatus", status_1.default);
route.use("/status_requests", requests_1.default);
route.use("/requests", requests_1.default);
route.use("/wish_list", wishList_1.default);
route.use("/wishlist", wishList_1.default);
exports.default = route;
