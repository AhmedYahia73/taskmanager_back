"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requests_1 = require("../../controllers/user/requests");
const authenticated_1 = require("../../middlewares/authenticated");
const requestRouter = (0, express_1.Router)();
// Apply auth middleware for user
requestRouter.use(authenticated_1.authenticated);
requestRouter.post("/holiday", requests_1.submitHolidayRequest);
requestRouter.post("/online", requests_1.submitOnlineRequest);
requestRouter.post("/permission", requests_1.submitPermission);
requestRouter.post("/extra-time", requests_1.submitExtraTimeRequest);
requestRouter.get("/extra-time", requests_1.getMyExtraTimeRequests);
exports.default = requestRouter;
