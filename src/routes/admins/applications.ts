import { Router } from "express";
import { getAllApplications, getApplicationById, updateApplicationFavourite, deleteApplication, ApplicationIdSchema, updateApplicationFavouriteSchema } from "../../controllers/admin/applications";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";

const route = Router();

route.get("/", catchAsync(getAllApplications));
route.get("/:id", validate(ApplicationIdSchema), catchAsync(getApplicationById));
route.patch("/:id/favourite", validate(updateApplicationFavouriteSchema), catchAsync(updateApplicationFavourite));
route.delete("/:id", validate(ApplicationIdSchema), catchAsync(deleteApplication));

export default route;
