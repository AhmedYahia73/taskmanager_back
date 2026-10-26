"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profile_1 = require("../controllers/profile");
const authenticated_1 = require("../middlewares/authenticated");
const upload_1 = require("../middlewares/upload");
const catchAsync_1 = require("../utils/catchAsync");
const route = (0, express_1.Router)();
// Profile endpoints - accessible by ANY authenticated role
route.use(authenticated_1.authenticated);
route.get("/", (0, catchAsync_1.catchAsync)(profile_1.getProfile));
route.put("/", upload_1.uploadUser.single("image"), (0, catchAsync_1.catchAsync)(profile_1.updateProfile));
route.patch("/", upload_1.uploadUser.single("image"), (0, catchAsync_1.catchAsync)(profile_1.updateProfile));
exports.default = route;
