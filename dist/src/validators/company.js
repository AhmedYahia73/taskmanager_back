"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companySchema = void 0;
const zod_1 = require("zod");
exports.companySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required").max(200),
    logo: zod_1.z.string().min(1, "Logo is required").max(200),
    owner_name: zod_1.z.string().max(200).optional().nullable(),
    address: zod_1.z.string().max(400).optional().nullable(),
    phone: zod_1.z.string().max(44).optional().nullable(),
    whatts: zod_1.z.string().max(100).optional().nullable(),
    facebook: zod_1.z.string().max(200).optional().nullable(),
    instgram: zod_1.z.string().max(200).optional().nullable(),
    email: zod_1.z.string().email("Invalid email format").max(100).optional().nullable().or(zod_1.z.literal("")),
});
