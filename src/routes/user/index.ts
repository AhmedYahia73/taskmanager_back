import { Router } from "express";
import attendanceRouter from "./attendance";
import requestRouter from "./requests";

const userRoute = Router();

userRoute.use("/attendance", attendanceRouter);
userRoute.use("/requests", requestRouter);

export default userRoute;
