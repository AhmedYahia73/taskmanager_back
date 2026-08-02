import { Router } from "express";
import { getAllUser, lists, getUserById, createUser, updateUser, deleteUser, getUserAttendanceReport, getUsersSelectionList } from "../../controllers/admin/user";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { createUserSchema, updateUserSchema, UserIdSchema } from "../../controllers/admin/user";

const route = Router();

route.get("/", catchAsync(getAllUser));
route.get("/selection-list", catchAsync(getUsersSelectionList));
route.get("/lists", catchAsync(lists));
route.get("/:id", validate(UserIdSchema), catchAsync(getUserById));
route.get("/:id/attendance-report", validate(UserIdSchema), catchAsync(getUserAttendanceReport));
route.post("/", validate(createUserSchema), catchAsync(createUser));
route.put("/:id", validate(updateUserSchema), catchAsync(updateUser));
route.delete("/:id", validate(UserIdSchema), catchAsync(deleteUser));

export default route;
