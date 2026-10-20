import { Router } from "express";
import { 
    getAllTasks, 
    lists, 
    getTaskById, 
    createTasks, 
    updateTasks, 
    reorderTasks,
    deleteTasks,
    delayTasks,
    pendingTasks,
    todayTasks,
    deleteTaskDocumentation,
    addTaskVoice,
    deleteTaskVoice,
    getTaskVoices,
} from "../../controllers/admin/tasks";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { createTasksSchema, updateTasksSchema, TaskIdSchema } from "../../controllers/admin/tasks";

import { uploadTask, uploadVoice } from "../../middlewares/upload";

const route = Router();

route.get("/", catchAsync(getAllTasks));
route.get("/lists", catchAsync(lists));
route.get("/delayTasks", catchAsync(delayTasks));
route.get("/pendingTasks", catchAsync(pendingTasks));
route.get("/todayTasks", catchAsync(todayTasks));
route.get("/:id", validate(TaskIdSchema), catchAsync(getTaskById));
route.post("/", uploadTask.single("documentation"), validate(createTasksSchema), catchAsync(createTasks));
route.put("/reorder", catchAsync(reorderTasks));
route.put("/:id", uploadTask.single("documentation"), validate(updateTasksSchema), catchAsync(updateTasks));
route.delete("/:id/documentation", validate(TaskIdSchema), catchAsync(deleteTaskDocumentation));
route.delete("/:id", validate(TaskIdSchema), catchAsync(deleteTasks));

// Voice Notes routes
route.get("/:id/voices", validate(TaskIdSchema), catchAsync(getTaskVoices));
route.post("/:id/voices", uploadVoice.single("voice"), catchAsync(addTaskVoice));
route.delete("/:id/voices/:voiceId", catchAsync(deleteTaskVoice));

export default route;
