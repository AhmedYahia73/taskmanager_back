import { Router } from "express";
import {
  getAllVisitStatuss,
  getVisitStatussById,
  createVisitStatuss,
  updateVisitStatuss,
  deleteVisitStatuss,
} from "../../../controllers/admin/sales/status";
import { catchAsync } from "../../../utils/catchAsync";
import { resolveSalesProject } from "../../../middlewares/resolveSalesProject";

const router = Router();
router.use(resolveSalesProject);

router.get("/", catchAsync(getAllVisitStatuss));
router.get("/:id", catchAsync(getVisitStatussById));
router.post("/", catchAsync(createVisitStatuss));
router.put("/:id", catchAsync(updateVisitStatuss));
router.delete("/:id", catchAsync(deleteVisitStatuss));

export default router;
