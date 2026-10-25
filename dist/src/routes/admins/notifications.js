"use strict";
// src/routes/admins/notifications.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notifications_1 = require("../../controllers/admin/notifications");
const catchAsync_1 = require("../../utils/catchAsync");
const route = (0, express_1.Router)();
route.get("/", (0, catchAsync_1.catchAsync)(notifications_1.getNotifications));
route.post("/fcm-token", (0, catchAsync_1.catchAsync)(notifications_1.registerFCMToken));
route.post("/test-fcm", (0, catchAsync_1.catchAsync)(notifications_1.testFCM));
route.put("/read-all", (0, catchAsync_1.catchAsync)(notifications_1.markAllAsRead));
route.put("/:id/read", (0, catchAsync_1.catchAsync)(notifications_1.markAsRead));
route.delete("/:id", (0, catchAsync_1.catchAsync)(notifications_1.deleteNotification));
exports.default = route;
