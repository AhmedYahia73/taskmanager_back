"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDepartmentSchema = exports.createDepartmentSchema = void 0;
const zod_1 = require("zod");
exports.createDepartmentSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, "Name is required").max(200),
        description: zod_1.z.string().optional().nullable(),
        zone_id: zod_1.z.string().min(1, "Zone ID is required"),
        manager_id: zod_1.z.string().min(1, "Manager ID is required"),
        status: zod_1.z.boolean().default(true),
    })
});
exports.updateDepartmentSchema = zod_1.z.object({
    body: exports.createDepartmentSchema.shape.body.partial()
});
