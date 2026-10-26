import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/profile";
import { authenticated } from "../middlewares/authenticated";
import { uploadUser } from "../middlewares/upload";
import { catchAsync } from "../utils/catchAsync";

const route = Router();

// Profile endpoints - accessible by ANY authenticated role
route.use(authenticated);

route.get("/", catchAsync(getProfile));
route.put("/", uploadUser.single("image"), catchAsync(updateProfile));
route.patch("/", uploadUser.single("image"), catchAsync(updateProfile));

export default route;
