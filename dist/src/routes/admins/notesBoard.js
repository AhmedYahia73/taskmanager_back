"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notesBoard_1 = require("../../controllers/admin/notesBoard");
const notesBoard_2 = require("../../controllers/admin/notesBoard");
const catchAsync_1 = require("../../utils/catchAsync");
const validation_1 = require("../../middlewares/validation");
const checkpermission_1 = require("../../middlewares/checkpermission");
const route = (0, express_1.Router)();
// Get notes by group id
route.get("/group/:groupId", (0, validation_1.validate)(notesBoard_2.GroupIdSchema), (0, catchAsync_1.catchAsync)(notesBoard_1.getNotesByGroupId));
// Create a note (Admin/Tester only)
route.post("/", (0, checkpermission_1.checkAdminTester)(), (0, validation_1.validate)(notesBoard_2.createNoteSchema), (0, catchAsync_1.catchAsync)(notesBoard_1.createNote));
// Update a note (Admin/Tester only)
route.put("/:id", (0, checkpermission_1.checkAdminTester)(), (0, validation_1.validate)(notesBoard_2.updateNoteSchema), (0, catchAsync_1.catchAsync)(notesBoard_1.updateNote));
// Delete a note (Admin/Tester only)
route.delete("/:id", (0, checkpermission_1.checkAdminTester)(), (0, validation_1.validate)(notesBoard_2.NoteIdSchema), (0, catchAsync_1.catchAsync)(notesBoard_1.deleteNote));
exports.default = route;
