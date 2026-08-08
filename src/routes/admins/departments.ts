import { Router } from "express";
import { 
  getAllDepartments, 
  getDepartmentDependencies, 
  createDepartment, 
  updateDepartment, 
  deleteDepartment 
} from "../../controllers/admin/departments";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { createDepartmentSchema, updateDepartmentSchema } from "../../validators/department";

const route = Router();

route.get("/", catchAsync(getAllDepartments));
route.get("/dependencies", catchAsync(getDepartmentDependencies));
route.post("/", validate(createDepartmentSchema), catchAsync(createDepartment));
route.put("/:id", validate(updateDepartmentSchema), catchAsync(updateDepartment));
route.delete("/:id", catchAsync(deleteDepartment));

export default route;
