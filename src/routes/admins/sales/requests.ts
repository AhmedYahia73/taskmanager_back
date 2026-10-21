import { Router } from "express";
import {
  getPendingRequest,
  getHistoryRequest,
  changeStatus,
} from "../../../controllers/admin/sales/statusRequests";
import { catchAsync } from "../../../utils/catchAsync";
import { resolveSalesProject } from "../../../middlewares/resolveSalesProject";

const router = Router();
router.use(resolveSalesProject);

router.get("/pending", catchAsync(getPendingRequest));
router.get("/history", catchAsync(getHistoryRequest));
router.put("/status/:id", catchAsync(changeStatus));

export default router;
