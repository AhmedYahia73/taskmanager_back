import { Router } from "express";
import attendanceRouter from "./attendance";
import requestRouter from "./requests";
import notesBoardRouter from "./notesBoard";
import biometricsRouter from "./biometrics";
import profileRoute from "../profile";

const userRoute = Router();

userRoute.use("/profile", profileRoute);
userRoute.use("/attendance", attendanceRouter);
userRoute.use("/requests", requestRouter);
userRoute.use("/notesBoard", notesBoardRouter);
userRoute.use("/biometrics", biometricsRouter);

export default userRoute;
