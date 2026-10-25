import { Router } from "express";
import authRoute from "./auth";
import adminRoute from "./admin";
import dashboardRoute from "./dashboard";
import projectRoute from "./project";
import projectGroupRoute from "./projectGroup";
import notesBoardRoute from "./notesBoard";
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
import salesProjectsRoute from "./salesProjects";
import salesAdminRoute from "./salesAdmin";
import salesLeaderRoute from "./salesLeader";
import salesRepsRoute from "./salesReps";
import salesRoute from "./sales/index";
import visitsRouter from "./sales/visits";
import leadsRouter from "./sales/leads";
import productsRouter from "./sales/products";
import targetRouter from "./sales/target";
import statusRouter from "./sales/status";
import requestsRouter from "./sales/requests";
import wishListRouter from "./sales/wishList";
import notificationsRoute from "./notifications";
import userOnlineDaysRoute from "./userOnlineDays";
import { authenticated } from "../../middlewares/authenticated";
import { checkAdmin, checkAdminLeader, checkAdminLeaderSales, checkAdminTester, checkAdminTesterEngineer } from "../../middlewares/checkpermission";

const route = Router();

route.use("/auth", authRoute);

// Accessible by any authenticated user (each user only accesses their own where user_id = req.user.id)
route.use("/notifications", authenticated, notificationsRoute);

// Apply middlewares for all routes below
route.use(authenticated, checkAdminTesterEngineer());

route.use("/settings", checkAdmin(), settingsRoute);
route.use("/user-online-days", checkAdmin(), userOnlineDaysRoute);
route.use("/admin", checkAdmin(), adminRoute);
route.use("/dashboard", dashboardRoute);
route.use("/project", projectRoute);
route.use("/projectGroup", projectGroupRoute);
route.use("/notesBoard", notesBoardRoute);
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
route.use("/company", checkAdminTesterEngineer(), companyRoute);
route.use("/departments", checkAdmin(), departmentsRoute);
route.use("/sales-projects", checkAdminLeader(), salesProjectsRoute);
route.use("/sales/admin", checkAdmin(), salesAdminRoute);
route.use("/sales/leader", checkAdmin(), salesLeaderRoute);
route.use("/sales/sales", checkAdminLeader(), salesRepsRoute);

// Unified Sales System Routes (scoped with resolveSalesProject)
route.use("/sales", checkAdminLeaderSales(), salesRoute);

// Direct Sales Aliases
route.use("/visits", checkAdminLeaderSales(), visitsRouter);
route.use("/leads", checkAdminLeaderSales(), leadsRouter);
route.use("/products", checkAdminLeaderSales(), productsRouter);
route.use("/target", checkAdminLeaderSales(), targetRouter);
route.use("/visit_status", checkAdminLeaderSales(), statusRouter);
route.use("/status_requests", checkAdminLeaderSales(), requestsRouter);
route.use("/wish_list", checkAdminLeaderSales(), wishListRouter);

export default route;
