import { Router } from "express";
import adminRoute from "./admins";
import userRoute from "./user";
import publicRoute from "./public";

const route = Router(); 
route.use("/admin", adminRoute); 
route.use("/user", userRoute);
route.use("/public", publicRoute);

export default route;
