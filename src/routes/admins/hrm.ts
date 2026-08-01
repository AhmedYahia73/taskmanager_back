import { Router } from "express";
import { 
    getHolidayRequests, updateHolidayRequestStatus, addHolidayRequest, updateHolidayRequest, deleteHolidayRequest,
    getOnlineRequests, updateOnlineRequestStatus, addOnlineRequest, updateOnlineRequest, deleteOnlineRequest,
    getPermissions, updatePermissionStatus, addPermission, updatePermission, deletePermission,
    getAttendance, addAttendance, updateAttendance, deleteAttendance,
    getHolidaysSystem, updateHolidaysSystem 
} from "../../controllers/admin/hrm";

const hrmRouter = Router();

// Holiday Requests
hrmRouter.get("/holiday-requests", getHolidayRequests);
hrmRouter.post("/holiday-requests", addHolidayRequest);
hrmRouter.put("/holiday-requests/:id", updateHolidayRequest);
hrmRouter.delete("/holiday-requests/:id", deleteHolidayRequest);
hrmRouter.put("/holiday-requests/:id/status", updateHolidayRequestStatus);

// Online Requests
hrmRouter.get("/online-requests", getOnlineRequests);
hrmRouter.post("/online-requests", addOnlineRequest);
hrmRouter.put("/online-requests/:id", updateOnlineRequest);
hrmRouter.delete("/online-requests/:id", deleteOnlineRequest);
hrmRouter.put("/online-requests/:id/status", updateOnlineRequestStatus);

// Permissions
hrmRouter.get("/permissions", getPermissions);
hrmRouter.post("/permissions", addPermission);
hrmRouter.put("/permissions/:id", updatePermission);
hrmRouter.delete("/permissions/:id", deletePermission);
hrmRouter.put("/permissions/:id/status", updatePermissionStatus);

// Attendance
hrmRouter.get("/attendance", getAttendance);
hrmRouter.post("/attendance", addAttendance);
hrmRouter.put("/attendance/:id", updateAttendance);
hrmRouter.delete("/attendance/:id", deleteAttendance);

// Holidays System
hrmRouter.get("/holidays-system", getHolidaysSystem);
hrmRouter.put("/holidays-system", updateHolidaysSystem);

export default hrmRouter;
