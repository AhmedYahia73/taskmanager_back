import { Router } from "express";
import { index, usersName, pointsChart, leaderboard } from "../../controllers/admin/dashboard";
import { catchAsync } from "../../utils/catchAsync";

const route = Router();

route.get("/", catchAsync(index));
route.get("/usersName", catchAsync(usersName));
route.get("/points-chart", catchAsync(pointsChart));
route.get("/leaderboard", catchAsync(leaderboard));

export default route;
