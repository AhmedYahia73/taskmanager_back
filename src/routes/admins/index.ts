import { Router } from "express";
import authRoute from "./auth";
import adminRoute from "./admin";
import dashboardRoute from "./dashboard";
import projectRoute from "./project";
import projectGroupRoute from "./projectGroup";
import tasksRoute from "./tasks";
import userRoute from "./user";
import { authenticated } from "../../middlewares/authenticated";
import { checkSuperAdmin } from "../../middlewares/checkpermission";

const route = Router();

route.use("/auth", authRoute);

// Apply middlewares for all routes below
route.use(authenticated, checkSuperAdmin());

route.use("/admin", adminRoute);
route.use("/dashboard", dashboardRoute);
route.use("/project", projectRoute);
route.use("/projectGroup", projectGroupRoute);
route.use("/tasks", tasksRoute);
route.use("/user", userRoute);

export default route;
