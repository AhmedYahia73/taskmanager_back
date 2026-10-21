import { Router } from "express";
import {
  getAllLeads,
  lists,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  convertLeadToVisit,
} from "../../../controllers/admin/sales/leads";
import { catchAsync } from "../../../utils/catchAsync";
import { resolveSalesProject } from "../../../middlewares/resolveSalesProject";

const router = Router();
router.use(resolveSalesProject);

router.get("/lists", catchAsync(lists));
router.get("/", catchAsync(getAllLeads));
router.post("/:id/convert", catchAsync(convertLeadToVisit));
router.post("/convert/:id", catchAsync(convertLeadToVisit));
router.get("/:id", catchAsync(getLeadById));
router.post("/", catchAsync(createLead));
router.put("/:id", catchAsync(updateLead));
router.delete("/:id", catchAsync(deleteLead));

export default router;
