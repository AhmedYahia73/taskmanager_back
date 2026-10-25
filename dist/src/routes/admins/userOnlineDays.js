"use strict";
// src/routes/admins/userOnlineDays.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userOnlineDays_1 = require("../../controllers/admin/userOnlineDays");
const catchAsync_1 = require("../../utils/catchAsync");
const route = (0, express_1.Router)();
route.get("/", (0, catchAsync_1.catchAsync)(userOnlineDays_1.getUsersOnlineDays));
route.put("/", (0, catchAsync_1.catchAsync)(userOnlineDays_1.updateUsersOnlineDays));
exports.default = route;
