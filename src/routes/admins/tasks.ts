import { Router } from "express";
import { 
    getAllTasks, 
    lists, 
    getTaskById, 
    createTasks, 
    updateTasks, 
    deleteTasks,
    delayTasks,
    pendingTasks,
    todayTasks,
} from "../../controllers/admin/tasks";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { createTasksSchema, updateTasksSchema, TaskIdSchema } from "../../controllers/admin/tasks";

import { uploadTask } from "../../middlewares/upload";

const route = Router();

route.get("/", catchAsync(getAllTasks));
route.get("/lists", catchAsync(lists));
route.get("/delayTasks", catchAsync(delayTasks));
route.get("/pendingTasks", catchAsync(pendingTasks));
route.get("/todayTasks", catchAsync(todayTasks));
route.get("/:id", validate(TaskIdSchema), catchAsync(getTaskById));
route.post("/", uploadTask.single("documentation"), validate(createTasksSchema), catchAsync(createTasks));
route.put("/:id", uploadTask.single("documentation"), validate(updateTasksSchema), catchAsync(updateTasks));
route.delete("/:id", validate(TaskIdSchema), catchAsync(deleteTasks));

export default route;
