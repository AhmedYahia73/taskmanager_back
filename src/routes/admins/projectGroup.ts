import { Router } from "express";
import { getAllGroup, lists, getGroupById, createProjectGroup, updateProjectGroup, deleteProjectGroup, getGroupUsers } from "../../controllers/admin/projectGroup";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { createProjectGroupSchema, updateProjectGroupSchema, GroupIdSchema } from "../../controllers/admin/projectGroup";

const route = Router();

route.get("/", catchAsync(getAllGroup));
route.get("/lists", catchAsync(lists));
route.get("/:id", validate(GroupIdSchema), catchAsync(getGroupById));
route.get("/:id/users", validate(GroupIdSchema), catchAsync(getGroupUsers));
route.post("/", validate(createProjectGroupSchema), catchAsync(createProjectGroup));
route.put("/:id", validate(updateProjectGroupSchema), catchAsync(updateProjectGroup));
route.delete("/:id", validate(GroupIdSchema), catchAsync(deleteProjectGroup));

export default route;
