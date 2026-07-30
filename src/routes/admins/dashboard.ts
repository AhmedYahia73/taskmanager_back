import { Router } from "express";
import { index, usersName } from "../../controllers/admin/dashboard";
import { catchAsync } from "../../utils/catchAsync";

const route = Router();

route.get("/", catchAsync(index));
route.get("/usersName", catchAsync(usersName));

export default route;
