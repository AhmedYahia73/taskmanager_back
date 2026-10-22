import { Router } from "express";
import {
  getAllTargets,
  getTargetsById,
  createTargets,
  updateTargets,
  deleteTargets,
  lists,
} from "../../../controllers/admin/sales/target";
import { catchAsync } from "../../../utils/catchAsync";
import { resolveSalesProject } from "../../../middlewares/resolveSalesProject";

const router = Router();
router.use(resolveSalesProject);

router.get("/sales/lists", catchAsync(lists));
router.get("/lists", catchAsync(lists));
router.get("/", catchAsync(getAllTargets));
router.get("/:id", catchAsync(getTargetsById));
router.post("/", catchAsync(createTargets));
router.put("/:id", catchAsync(updateTargets));
router.delete("/:id", catchAsync(deleteTargets));

export default router;
