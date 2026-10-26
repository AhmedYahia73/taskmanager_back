import { Router } from "express";
import adminRoute from "./admins";
import userRoute from "./user";
import publicRoute from "./public";
import profileRoute from "./profile";

const route = Router(); 
route.use("/profile", profileRoute);
route.use("/admin", adminRoute); 
route.use("/user", userRoute);
route.use("/public", publicRoute);

export default route;
