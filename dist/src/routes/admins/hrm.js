"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const hrm_1 = require("../../controllers/admin/hrm");
const hrmRouter = (0, express_1.Router)();
// Holiday Requests
hrmRouter.get("/holiday-requests", hrm_1.getHolidayRequests);
hrmRouter.put("/holiday-requests/:id/status", hrm_1.updateHolidayRequestStatus);
// Online Requests
hrmRouter.get("/online-requests", hrm_1.getOnlineRequests);
hrmRouter.put("/online-requests/:id/status", hrm_1.updateOnlineRequestStatus);
// Attendance
hrmRouter.get("/attendance", hrm_1.getAttendance);
// Holidays System
hrmRouter.get("/holidays-system", hrm_1.getHolidaysSystem);
hrmRouter.put("/holidays-system", hrm_1.updateHolidaysSystem);
exports.default = hrmRouter;
