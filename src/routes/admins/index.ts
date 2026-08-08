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
import zonesRoute from "./zones";
import shiftsRoute from "./shifts";
import salariesRoute from "./salaries";
import bonusesRoute from "./bonuses";
import deductionsRoute from "./deductions";
import payrollRoute from "./payroll";
import citiesRoute from "./cities";
import jobsRoute from "./jobs";
import qualificationsRoute from "./qualifications";
import applicationsRoute from "./applications";
import companyRoute from "./company";
import departmentsRoute from "./departments";
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
route.use("/hrm", checkAdminTesterEngineer(), hrmRoute);
route.use("/zones", checkAdmin(), zonesRoute);
route.use("/shifts", checkAdmin(), shiftsRoute);
route.use("/salaries", checkAdmin(), salariesRoute);
route.use("/bonuses", checkAdmin(), bonusesRoute);
route.use("/deductions", checkAdmin(), deductionsRoute);
route.use("/payroll", checkAdmin(), payrollRoute);
route.use("/cities", checkAdmin(), citiesRoute);
route.use("/jobs", checkAdmin(), jobsRoute);
route.use("/qualifications", checkAdmin(), qualificationsRoute);
route.use("/applications", checkAdmin(), applicationsRoute);
route.use("/company", checkAdmin(), companyRoute);
route.use("/departments", checkAdmin(), departmentsRoute);

export default route;
