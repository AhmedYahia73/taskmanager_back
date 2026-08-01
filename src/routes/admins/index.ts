import { Router } from "express";
import authRoute from "./auth";
import adminRoute from "./admin";
import dashboardRoute from "./dashboard";
import projectRoute from "./project";
import projectGroupRoute from "./projectGroup";
import tasksRoute from "./tasks";
import settingsRoute from "./settings";
import userRoute from "./user";
import hrmRoute from "./hrm";
import { authenticated } from "../../middlewares/authenticated";
import { checkAdmin, checkAdminTester, checkAdminTesterEngineer } from "../../middlewares/checkpermission";

const route = Router();

route.use("/auth", authRoute);

// Apply middlewares for all routes below
route.use(authenticated, checkAdminTesterEngineer());

route.use("/settings", checkAdmin(), settingsRoute);
route.use("/admin", checkAdmin(), adminRoute);
route.use("/dashboard", dashboardRoute);
route.use("/project", projectRoute);
route.use("/projectGroup", projectGroupRoute);
route.use("/tasks", tasksRoute);
route.use("/user", checkAdmin(), userRoute);
route.use("/hrm", checkAdmin(), hrmRoute);

export default route;
