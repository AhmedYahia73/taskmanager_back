import { Router } from "express";
import {
  getAllSalesLeaders,
  getSalesLeaderById,
  createSalesLeader,
  updateSalesLeader,
  deleteSalesLeader,
  changeSalesLeaderRole,
  lists,
  createSalesLeaderSchema,
  updateSalesLeaderSchema,
  changeSalesLeaderRoleSchema,
  salesLeaderIdSchema,
} from "../../controllers/admin/salesLeader";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { uploadSalesUser } from "../../middlewares/upload";

const route = Router();

route.get("/lists", catchAsync(lists));
route.get("/", catchAsync(getAllSalesLeaders));
route.get("/:id", validate(salesLeaderIdSchema), catchAsync(getSalesLeaderById));
route.post("/", uploadSalesUser.single("image"), validate(createSalesLeaderSchema), catchAsync(createSalesLeader));
route.put("/:id", uploadSalesUser.single("image"), validate(updateSalesLeaderSchema), catchAsync(updateSalesLeader));
route.put("/:id/role", validate(changeSalesLeaderRoleSchema), catchAsync(changeSalesLeaderRole));
route.patch("/:id/role", validate(changeSalesLeaderRoleSchema), catchAsync(changeSalesLeaderRole));
route.delete("/:id", validate(salesLeaderIdSchema), catchAsync(deleteSalesLeader));

export default route;
