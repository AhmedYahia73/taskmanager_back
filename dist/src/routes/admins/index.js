"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const admin_1 = __importDefault(require("./admin"));
const dashboard_1 = __importDefault(require("./dashboard"));
const project_1 = __importDefault(require("./project"));
const projectGroup_1 = __importDefault(require("./projectGroup"));
const tasks_1 = __importDefault(require("./tasks"));
const settings_1 = __importDefault(require("./settings"));
const user_1 = __importDefault(require("./user"));
const authenticated_1 = require("../../middlewares/authenticated");
const checkpermission_1 = require("../../middlewares/checkpermission");
const route = (0, express_1.Router)();
route.use("/auth", auth_1.default);
// Apply middlewares for all routes below
route.use(authenticated_1.authenticated, (0, checkpermission_1.checkAdminTesterEngineer)());
route.use("/settings", (0, checkpermission_1.checkAdmin)(), settings_1.default);
route.use("/admin", (0, checkpermission_1.checkAdmin)(), admin_1.default);
route.use("/dashboard", dashboard_1.default);
route.use("/project", project_1.default);
route.use("/projectGroup", projectGroup_1.default);
route.use("/tasks", tasks_1.default);
route.use("/user", (0, checkpermission_1.checkAdmin)(), user_1.default);
exports.default = route;
