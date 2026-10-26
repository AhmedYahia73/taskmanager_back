"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admins_1 = __importDefault(require("./admins"));
const user_1 = __importDefault(require("./user"));
const public_1 = __importDefault(require("./public"));
const profile_1 = __importDefault(require("./profile"));
const route = (0, express_1.Router)();
route.use("/profile", profile_1.default);
route.use("/admin", admins_1.default);
route.use("/user", user_1.default);
route.use("/public", public_1.default);
exports.default = route;
