import { Router } from "express";
import {
  getAllSalesAdmins,
  getSalesAdminById,
  createSalesAdmin,
  updateSalesAdmin,
  deleteSalesAdmin,
  lists,
  createSalesAdminSchema,
  updateSalesAdminSchema,
  salesAdminIdSchema,
} from "../../controllers/admin/salesAdmin";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { uploadSalesUser } from "../../middlewares/upload";

const route = Router();

route.get("/lists", catchAsync(lists));
route.get("/", catchAsync(getAllSalesAdmins));
route.get("/:id", validate(salesAdminIdSchema), catchAsync(getSalesAdminById));
route.post("/", uploadSalesUser.single("image"), validate(createSalesAdminSchema), catchAsync(createSalesAdmin));
route.put("/:id", uploadSalesUser.single("image"), validate(updateSalesAdminSchema), catchAsync(updateSalesAdmin));
route.delete("/:id", validate(salesAdminIdSchema), catchAsync(deleteSalesAdmin));

export default route;
