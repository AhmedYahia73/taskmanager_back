"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notesBoard_1 = require("../../controllers/user/notesBoard");
const notesBoard_2 = require("../../controllers/user/notesBoard");
const catchAsync_1 = require("../../utils/catchAsync");
const validation_1 = require("../../middlewares/validation");
const route = (0, express_1.Router)();
// Get notes by group id (Engineers)
route.get("/group/:groupId", (0, validation_1.validate)(notesBoard_2.GroupIdSchema), (0, catchAsync_1.catchAsync)(notesBoard_1.getNotesByGroupId));
exports.default = route;
