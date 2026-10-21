import { Router } from "express";
import {
  getAllVisits,
  lists,
  getVisitsById,
  createVisits,
  updateVisits,
  deleteVisits,
  getAllSales,
  getVisitsCounts,
} from "../../../controllers/admin/sales/visits";
import { catchAsync } from "../../../utils/catchAsync";
import { resolveSalesProject } from "../../../middlewares/resolveSalesProject";

const router = Router();
router.use(resolveSalesProject);

router.get("/lists", catchAsync(lists));
router.get("/sales", catchAsync(getAllSales));
router.get("/counts", catchAsync(getVisitsCounts));
router.get("/", catchAsync(getAllVisits));
router.get("/:id", catchAsync(getVisitsById));
router.post("/", catchAsync(createVisits));
router.put("/:id", catchAsync(updateVisits));
router.delete("/:id", catchAsync(deleteVisits));

export default router;
