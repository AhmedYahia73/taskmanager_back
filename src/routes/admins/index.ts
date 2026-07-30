import { Router } from "express";
import authRoute from "./auth";
import adminRoute from "./admin";
import dashboardRoute from "./dashboard";
import projectRoute from "./project";
import projectGroupRoute from "./projectGroup";
import tasksRoute from "./tasks";
import settingsRoute from "./settings";
import userRoute from "./user";
import { authenticated } from "../../middlewares/authenticated";
import { checkAdmin } from "../../middlewares/checkpermission";

const route = Router();

route.use("/auth", authRoute);

// Apply middlewares for all routes below
route.use(authenticated, checkAdmin());

route.use("/settings", settingsRoute);
route.use("/admin", adminRoute);
route.use("/dashboard", dashboardRoute);
route.use("/project", projectRoute);
route.use("/projectGroup", projectGroupRoute);
route.use("/tasks", tasksRoute);
route.use("/user", userRoute);

export default route;
