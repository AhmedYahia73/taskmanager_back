import { Router } from "express";
import { index } from "../../controllers/admin/dashboard";
import { catchAsync } from "../../utils/catchAsync";

const route = Router();

route.get("/", catchAsync(index));

export default route;
