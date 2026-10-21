import { Router } from "express";
import dashboardRouter from "./dashboard";
import visitsRouter from "./visits";
import leadsRouter from "./leads";
import productsRouter from "./products";
import targetRouter from "./target";
import statusRouter from "./status";
import requestsRouter from "./requests";
import wishListRouter from "./wishList";

const route = Router();

route.use("/dashboard", dashboardRouter);
route.use("/visits", visitsRouter);
route.use("/leads", leadsRouter);
route.use("/products", productsRouter);
route.use("/target", targetRouter);
route.use("/visit_status", statusRouter);
route.use("/status_requests", requestsRouter);
route.use("/wish_list", wishListRouter);

export default route;
