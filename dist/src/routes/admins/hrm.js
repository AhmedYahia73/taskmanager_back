"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const hrm_1 = require("../../controllers/admin/hrm");
const hrmRouter = (0, express_1.Router)();
// Holiday Requests
hrmRouter.get("/holiday-requests", hrm_1.getHolidayRequests);
hrmRouter.post("/holiday-requests", hrm_1.addHolidayRequest);
hrmRouter.put("/holiday-requests/:id", hrm_1.updateHolidayRequest);
hrmRouter.delete("/holiday-requests/:id", hrm_1.deleteHolidayRequest);
hrmRouter.put("/holiday-requests/:id/status", hrm_1.updateHolidayRequestStatus);
// Online Requests
hrmRouter.get("/online-requests", hrm_1.getOnlineRequests);
hrmRouter.post("/online-requests", hrm_1.addOnlineRequest);
hrmRouter.put("/online-requests/:id", hrm_1.updateOnlineRequest);
hrmRouter.delete("/online-requests/:id", hrm_1.deleteOnlineRequest);
hrmRouter.put("/online-requests/:id/status", hrm_1.updateOnlineRequestStatus);
// Permissions
hrmRouter.get("/permissions", hrm_1.getPermissions);
hrmRouter.post("/permissions", hrm_1.addPermission);
hrmRouter.put("/permissions/:id", hrm_1.updatePermission);
hrmRouter.delete("/permissions/:id", hrm_1.deletePermission);
hrmRouter.put("/permissions/:id/status", hrm_1.updatePermissionStatus);
// Attendance
hrmRouter.get("/attendance", hrm_1.getAttendance);
hrmRouter.post("/attendance", hrm_1.addAttendance);
hrmRouter.put("/attendance/:id", hrm_1.updateAttendance);
hrmRouter.delete("/attendance/:id", hrm_1.deleteAttendance);
// Holidays System
hrmRouter.get("/holidays-system", hrm_1.getHolidaysSystem);
hrmRouter.put("/holidays-system", hrm_1.updateHolidaysSystem);
exports.default = hrmRouter;
