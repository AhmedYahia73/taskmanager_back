"use strict";
// src/controllers/admin/sales/helpers.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdminRole = exports.isLeader = exports.getProjectId = void 0;
const getProjectId = (req) => {
    const pid = req.salesProjectId || req.headers["x-sales-project-id"] || req.headers["sales_project_id"] || req.user?.project_id;
    return pid ? String(pid).trim() : undefined;
};
exports.getProjectId = getProjectId;
const isLeader = (role) => {
    return role === "leader" || role === "leader_sales" || role === "tester";
};
exports.isLeader = isLeader;
const isAdminRole = (role) => {
    return role === "admin" || role === "super_admin";
};
exports.isAdminRole = isAdminRole;
