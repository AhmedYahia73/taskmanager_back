import { Router } from "express";
import { getNotesByGroupId } from "../../controllers/user/notesBoard";
import { GroupIdSchema } from "../../controllers/user/notesBoard";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";

const route = Router();

// Get notes by group id (Engineers)
route.get("/group/:groupId", validate(GroupIdSchema), catchAsync(getNotesByGroupId));

export default route;
