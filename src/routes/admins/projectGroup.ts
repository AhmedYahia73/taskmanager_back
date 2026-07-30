import { Router } from "express";
import { getAllGroup, lists, getGroupById, createProjectGroup, updateProjectGroup, deleteProjectGroup, getGroupUsers } from "../../controllers/admin/projectGroup";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { createProjectGroupSchema, updateProjectGroupSchema, GroupIdSchema } from "../../controllers/admin/projectGroup";
import { checkAdminTester } from "../../middlewares/checkpermission";

const route = Router();

route.get("/", catchAsync(getAllGroup));
route.get("/lists", catchAsync(lists));
route.get("/:id", validate(GroupIdSchema), catchAsync(getGroupById));
route.get("/:id/users", validate(GroupIdSchema), catchAsync(getGroupUsers));
route.post("/", checkAdminTester(), validate(createProjectGroupSchema), catchAsync(createProjectGroup));
route.put("/:id", checkAdminTester(), validate(updateProjectGroupSchema), catchAsync(updateProjectGroup));
route.delete("/:id", checkAdminTester(), validate(GroupIdSchema), catchAsync(deleteProjectGroup));

export default route;
