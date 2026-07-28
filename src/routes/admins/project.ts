import { Router } from "express";
import { getAllProject, getProjectById, lists, createProject, updateProject, deleteProject, getProjectUsers } from "../../controllers/admin/project";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { createProjectSchema, updateProjectSchema, ProjectIdSchema } from "../../controllers/admin/project";

const route = Router();

route.get("/", catchAsync(getAllProject));
route.get("/lists", catchAsync(lists));
route.get("/:id", validate(ProjectIdSchema), catchAsync(getProjectById));
route.get("/:id/users", validate(ProjectIdSchema), catchAsync(getProjectUsers));
route.post("/", validate(createProjectSchema), catchAsync(createProject));
route.put("/:id", validate(updateProjectSchema), catchAsync(updateProject));
route.delete("/:id", validate(ProjectIdSchema), catchAsync(deleteProject));

export default route;
