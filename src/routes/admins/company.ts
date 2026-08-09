import { Router } from "express";
import { getCompany, updateCompany } from "../../controllers/admin/company";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { companySchema } from "../../validators/company";
import { checkAdmin } from "../../middlewares/checkpermission";

const route = Router();

route.get("/", catchAsync(getCompany));
route.put("/", checkAdmin(), validate(companySchema), catchAsync(updateCompany));

export default route;
