"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payroll_1 = require("../../controllers/admin/payroll");
const router = (0, express_1.Router)();
router.get("/", payroll_1.getPayroll);
exports.default = router;
