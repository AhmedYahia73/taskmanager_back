import { Router } from "express";
import attendanceRouter from "./attendance";
import requestRouter from "./requests";
import notesBoardRouter from "./notesBoard";

const userRoute = Router();

userRoute.use("/attendance", attendanceRouter);
userRoute.use("/requests", requestRouter);
userRoute.use("/notesBoard", notesBoardRouter);

export default userRoute;
