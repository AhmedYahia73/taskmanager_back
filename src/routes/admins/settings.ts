import { Router } from "express";
import { getSettings, updateSettings } from "../../controllers/admin/settings";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";

const route = Router();

route.get("/", catchAsync(getSettings));
route.put("/:id", catchAsync(updateSettings));

export default route;
