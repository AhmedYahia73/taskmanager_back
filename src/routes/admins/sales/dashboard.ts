import { Router } from "express";
import { viewDashboard } from "../../../controllers/admin/sales/dashboard";
import { catchAsync } from "../../../utils/catchAsync";
import { resolveSalesProject } from "../../../middlewares/resolveSalesProject";

const router = Router();
router.get("/", resolveSalesProject, catchAsync(viewDashboard));
router.post("/", resolveSalesProject, catchAsync(viewDashboard));

export default router;
