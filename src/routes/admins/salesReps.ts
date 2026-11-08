import { Router } from "express";
import {
  getAllSalesReps,
  getSalesRepById,
  createSalesRep,
  updateSalesRep,
  deleteSalesRep,
  changeSalesRepRole,
  lists,
  createSalesRepSchema,
  updateSalesRepSchema,
  changeSalesRepRoleSchema,
  salesRepIdSchema,
} from "../../controllers/admin/salesReps";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { uploadSalesUser } from "../../middlewares/upload";

const route = Router();

route.get("/lists", catchAsync(lists));
route.get("/", catchAsync(getAllSalesReps));
route.get("/:id", validate(salesRepIdSchema), catchAsync(getSalesRepById));
route.post("/", uploadSalesUser.single("image"), validate(createSalesRepSchema), catchAsync(createSalesRep));
route.put("/:id", uploadSalesUser.single("image"), validate(updateSalesRepSchema), catchAsync(updateSalesRep));
route.put("/:id/role", validate(changeSalesRepRoleSchema), catchAsync(changeSalesRepRole));
route.patch("/:id/role", validate(changeSalesRepRoleSchema), catchAsync(changeSalesRepRole));
route.delete("/:id", validate(salesRepIdSchema), catchAsync(deleteSalesRep));

export default route;
