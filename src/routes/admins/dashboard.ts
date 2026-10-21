import { Router } from "express";
import { index, usersName, pointsChart, leaderboard } from "../../controllers/admin/dashboard";
import { viewDashboard } from "../../controllers/admin/sales/dashboard";
import { catchAsync } from "../../utils/catchAsync";

const route = Router();

route.get("/", catchAsync(async (req, res) => {
  if (req.headers["x-sales-project-id"] || req.query.sales_project_id || req.headers["sales_project_id"]) {
    return viewDashboard(req, res);
  }
  return index(req, res);
}));
route.get("/usersName", catchAsync(usersName));
route.get("/points-chart", catchAsync(pointsChart));
route.get("/leaderboard", catchAsync(leaderboard));

export default route;
