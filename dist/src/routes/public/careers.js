"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const careers_1 = require("../../controllers/public/careers");
const catchAsync_1 = require("../../utils/catchAsync");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
// Setup multer for CV uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/cvs');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedExts = ['.pdf', '.doc', '.docx'];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (allowedExts.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
        }
    }
});
const route = (0, express_1.Router)();
route.get("/jobs", (0, catchAsync_1.catchAsync)(careers_1.getActiveJobs));
route.get("/cities", (0, catchAsync_1.catchAsync)(careers_1.getActiveCities));
route.get("/qualifications", (0, catchAsync_1.catchAsync)(careers_1.getActiveQualifications));
route.post("/apply", upload.single('upload_cv'), (0, catchAsync_1.catchAsync)(careers_1.submitApplication));
exports.default = route;
