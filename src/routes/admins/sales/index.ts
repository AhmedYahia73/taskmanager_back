import { Router } from "express";
import dashboardRouter from "./dashboard";
import visitsRouter from "./visits";
import leadsRouter from "./leads";
import productsRouter from "./products";
import targetRouter from "./target";
import statusRouter from "./status";
import requestsRouter from "./requests";
import wishListRouter from "./wishList";
import salesProjectsRoute from "../salesProjects";
import salesAdminRoute from "../salesAdmin";
import salesLeaderRoute from "../salesLeader";
import salesRepsRoute from "../salesReps";

const route = Router();

// 📁 Sales Projects Directory under /sales
route.use("/projects", salesProjectsRoute);
route.use("/sales-projects", salesProjectsRoute);

// 👥 Sales Team Roles under /sales
route.use("/admin", salesAdminRoute);
route.use("/admins", salesAdminRoute);
route.use("/leader", salesLeaderRoute);
route.use("/leaders", salesLeaderRoute);
route.use("/sales", salesRepsRoute);

// 📊 Sales Workspace Modules
route.use("/dashboard", dashboardRouter);
route.use("/visits", visitsRouter);
route.use("/leads", leadsRouter);
route.use("/products", productsRouter);
route.use("/target", targetRouter);
route.use("/targets", targetRouter);
route.use("/visit_status", statusRouter);
route.use("/visitstatus", statusRouter);
route.use("/status_requests", requestsRouter);
route.use("/requests", requestsRouter);
route.use("/wish_list", wishListRouter);
route.use("/wishlist", wishListRouter);

export default route;
