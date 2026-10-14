import { Router } from "express";
import { getAllAdmin, getAdminById, createAdmin, updateAdmin, deleteAdmin } from "../../controllers/admin/admin";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { createAdminSchema, updateAdminSchema, adminIdSchema } from "../../controllers/admin/admin";

import { uploadAdmin } from "../../middlewares/upload";

const route = Router();

route.get("/", catchAsync(getAllAdmin));
route.get("/:id", validate(adminIdSchema), catchAsync(getAdminById));
route.post("/", uploadAdmin.single("image"), validate(createAdminSchema), catchAsync(createAdmin));
route.put("/:id", uploadAdmin.single("image"), validate(updateAdminSchema), catchAsync(updateAdmin));
route.delete("/:id", validate(adminIdSchema), catchAsync(deleteAdmin));

export default route;
