import { Router } from "express";
import { getAllTasks, lists, getTaskById, createTasks, updateTasks, deleteTasks } from "../../controllers/admin/tasks";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { createTasksSchema, updateTasksSchema, TaskIdSchema } from "../../controllers/admin/tasks";

const route = Router();

route.get("/", catchAsync(getAllTasks));
route.get("/lists", catchAsync(lists));
route.get("/:id", validate(TaskIdSchema), catchAsync(getTaskById));
route.post("/", validate(createTasksSchema), catchAsync(createTasks));
route.put("/:id", validate(updateTasksSchema), catchAsync(updateTasks));
route.delete("/:id", validate(TaskIdSchema), catchAsync(deleteTasks));

export default route;
