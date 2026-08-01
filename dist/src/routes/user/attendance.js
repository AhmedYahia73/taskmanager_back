"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendance_1 = require("../../controllers/user/attendance");
const authenticated_1 = require("../../middlewares/authenticated");
const attendanceRouter = (0, express_1.Router)();
// Apply auth middleware for user
attendanceRouter.use(authenticated_1.authenticated);
attendanceRouter.get("/status", attendance_1.getAttendanceStatus);
attendanceRouter.get("/report", attendance_1.getMyAttendanceReport);
attendanceRouter.post("/check-in", attendance_1.checkIn);
attendanceRouter.put("/check-out", attendance_1.checkOut);
exports.default = attendanceRouter;
