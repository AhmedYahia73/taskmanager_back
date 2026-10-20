import { Router } from "express";
import {
  getAllSalesProjects,
  getSalesProjectById,
  createSalesProject,
  updateSalesProject,
  deleteSalesProject,
  getProjectAccessToken,
} from "../../controllers/admin/salesProjects";
import { uploadSalesProject } from "../../middlewares/upload";
import { catchAsync } from "../../utils/catchAsync";

const route = Router();

route.get("/", catchAsync(getAllSalesProjects));
route.get("/:id", catchAsync(getSalesProjectById));
route.get("/:id/access-token", catchAsync(getProjectAccessToken));
route.post("/:id/access-token", catchAsync(getProjectAccessToken));
route.post("/", uploadSalesProject.single("logo"), catchAsync(createSalesProject));
route.put("/:id", uploadSalesProject.single("logo"), catchAsync(updateSalesProject));
route.delete("/:id", catchAsync(deleteSalesProject));

export default route;
