import { Router } from "express";
import { getAllAdmin, getAdminById, createAdmin, updateAdmin, deleteAdmin } from "../../controllers/admin/admin";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { createAdminSchema, updateAdminSchema, adminIdSchema } from "../../controllers/admin/admin";

const route = Router();

route.get("/", catchAsync(getAllAdmin));
route.get("/:id", validate(adminIdSchema), catchAsync(getAdminById));
route.post("/", validate(createAdminSchema), catchAsync(createAdmin));
route.put("/:id", validate(updateAdminSchema), catchAsync(updateAdmin));
route.delete("/:id", validate(adminIdSchema), catchAsync(deleteAdmin));

export default route;
