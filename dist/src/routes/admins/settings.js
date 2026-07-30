"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settings_1 = require("../../controllers/admin/settings");
const catchAsync_1 = require("../../utils/catchAsync");
const route = (0, express_1.Router)();
route.get("/", (0, catchAsync_1.catchAsync)(settings_1.getSettings));
route.put("/:id", (0, catchAsync_1.catchAsync)(settings_1.updateSettings));
exports.default = route;
