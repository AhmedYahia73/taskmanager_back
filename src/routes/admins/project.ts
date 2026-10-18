import { Router } from "express";
import { getAllProject, getProjectById, lists, createProject, updateProject, deleteProject, getProjectUsers, deleteProjectDocumentation } from "../../controllers/admin/project";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { createProjectSchema, updateProjectSchema, ProjectIdSchema } from "../../controllers/admin/project";
import { checkAdminTester } from "../../middlewares/checkpermission";

import { uploadProject } from "../../middlewares/upload";

const route = Router();

const projectUploadFields = uploadProject.fields([
  { name: "logo", maxCount: 1 },
  { name: "documentation", maxCount: 1 },
]);

route.get("/", catchAsync(getAllProject));
route.get("/lists", catchAsync(lists));
route.get("/:id", validate(ProjectIdSchema), catchAsync(getProjectById));
route.get("/:id/users", validate(ProjectIdSchema), catchAsync(getProjectUsers));
route.post("/", checkAdminTester(), projectUploadFields, validate(createProjectSchema), catchAsync(createProject));
route.put("/:id", checkAdminTester(), projectUploadFields, validate(updateProjectSchema), catchAsync(updateProject));
route.delete("/:id/documentation", checkAdminTester(), validate(ProjectIdSchema), catchAsync(deleteProjectDocumentation));
route.delete("/:id", checkAdminTester(), validate(ProjectIdSchema), catchAsync(deleteProject));

export default route;
