"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_1 = require("../../controllers/admin/dashboard");
const dashboard_2 = require("../../controllers/admin/sales/dashboard");
const catchAsync_1 = require("../../utils/catchAsync");
const route = (0, express_1.Router)();
route.get("/", (0, catchAsync_1.catchAsync)(async (req, res) => {
    if (req.headers["x-sales-project-id"] || req.query.sales_project_id || req.headers["sales_project_id"]) {
        return (0, dashboard_2.viewDashboard)(req, res);
    }
    return (0, dashboard_1.index)(req, res);
}));
route.get("/usersName", (0, catchAsync_1.catchAsync)(dashboard_1.usersName));
route.get("/points-chart", (0, catchAsync_1.catchAsync)(dashboard_1.pointsChart));
route.get("/leaderboard", (0, catchAsync_1.catchAsync)(dashboard_1.leaderboard));
exports.default = route;
