import { Router } from "express";
import careersRoute from "./careers";

const route = Router();

route.use("/careers", careersRoute);

export default route;
