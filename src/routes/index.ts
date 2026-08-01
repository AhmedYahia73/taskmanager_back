import { Router } from "express";
import adminRoute from "./admins";
import userRoute from "./user";
const route = Router(); 
route.use("/admin", adminRoute); 
route.use("/user", userRoute);
export default route;
