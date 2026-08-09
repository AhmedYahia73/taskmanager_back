import { Router } from "express";
import { 
    createNote, 
    getNotesByGroupId, 
    updateNote, 
    deleteNote 
} from "../../controllers/admin/notesBoard";
import { 
    createNoteSchema, 
    updateNoteSchema, 
    NoteIdSchema, 
    GroupIdSchema 
} from "../../controllers/admin/notesBoard";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { checkAdminTester } from "../../middlewares/checkpermission";

const route = Router();

// Get notes by group id
route.get("/group/:groupId", validate(GroupIdSchema), catchAsync(getNotesByGroupId));

// Create a note (Admin/Tester only)
route.post("/", checkAdminTester(), validate(createNoteSchema), catchAsync(createNote));

// Update a note (Admin/Tester only)
route.put("/:id", checkAdminTester(), validate(updateNoteSchema), catchAsync(updateNote));

// Delete a note (Admin/Tester only)
route.delete("/:id", checkAdminTester(), validate(NoteIdSchema), catchAsync(deleteNote));

export default route;
