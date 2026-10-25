import { Router } from "express";
import { checkIn, checkOut, getAttendanceStatus, getMyAttendanceReport, getMyZone } from "../../controllers/user/attendance";
import { authenticated } from "../../middlewares/authenticated";

const attendanceRouter = Router();

// Apply auth middleware for user
attendanceRouter.use(authenticated);

attendanceRouter.get("/status", getAttendanceStatus);
attendanceRouter.get("/my-zone", getMyZone);
attendanceRouter.get("/report", getMyAttendanceReport);
attendanceRouter.post("/check-in", checkIn);
attendanceRouter.put("/check-out", checkOut);

export default attendanceRouter;
