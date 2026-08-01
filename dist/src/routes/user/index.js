"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendance_1 = __importDefault(require("./attendance"));
const requests_1 = __importDefault(require("./requests"));
const userRoute = (0, express_1.Router)();
userRoute.use("/attendance", attendance_1.default);
userRoute.use("/requests", requests_1.default);
exports.default = userRoute;
