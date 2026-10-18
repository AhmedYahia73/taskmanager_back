"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadVoice = exports.uploadTask = exports.uploadProjectGroup = exports.uploadProject = exports.uploadCompany = exports.uploadUser = exports.uploadAdmin = exports.parseArray = exports.getFileUrl = exports.createUploader = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
// Helper function to create multer instance for a specific uploads subfolder
const createUploader = (folder) => {
    const uploadDir = path_1.default.resolve(__dirname, "../../uploads", folder);
    const storage = multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            if (!fs_1.default.existsSync(uploadDir)) {
                fs_1.default.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            let ext = path_1.default.extname(file.originalname).toLowerCase();
            if (!ext || ext === ".") {
                if (file.mimetype.includes("webm"))
                    ext = ".webm";
                else if (file.mimetype.includes("wav"))
                    ext = ".wav";
                else if (file.mimetype.includes("mp3") || file.mimetype.includes("mpeg"))
                    ext = ".mp3";
                else if (file.mimetype.includes("ogg"))
                    ext = ".ogg";
                else if (file.mimetype.includes("mp4") || file.mimetype.includes("m4a"))
                    ext = ".m4a";
                else if (file.mimetype.includes("pdf"))
                    ext = ".pdf";
                else
                    ext = ".png";
            }
            const fileName = `${(0, uuid_1.v4)()}${ext}`;
            cb(null, fileName);
        },
    });
    return (0, multer_1.default)({
        storage,
        limits: {
            fileSize: 50 * 1024 * 1024, // 50MB maximum file size
        },
    });
};
exports.createUploader = createUploader;
// Helper function to generate accessible URL for an uploaded file
const getFileUrl = (req, file, folder) => {
    const filename = file.filename;
    let subfolder = folder;
    if (!subfolder && file.destination) {
        subfolder = path_1.default.basename(file.destination);
    }
    const relativePath = subfolder ? `uploads/${subfolder}/${filename}` : `uploads/${filename}`;
    return `${req.protocol}://${req.get("host")}/${relativePath}`;
};
exports.getFileUrl = getFileUrl;
// Helper function for Zod to parse arrays that may arrive as strings (e.g. from FormData)
const parseArray = (val) => {
    if (typeof val === "string") {
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed))
                return parsed;
        }
        catch { }
        if (val.trim() === "")
            return [];
        if (val.includes(","))
            return val.split(",").map((s) => s.trim()).filter(Boolean);
        return [val];
    }
    if (Array.isArray(val))
        return val;
    return val;
};
exports.parseArray = parseArray;
// Pre-configured uploaders for application modules
exports.uploadAdmin = (0, exports.createUploader)("admins");
exports.uploadUser = (0, exports.createUploader)("Users");
exports.uploadCompany = (0, exports.createUploader)("companies");
exports.uploadProject = (0, exports.createUploader)("projects");
exports.uploadProjectGroup = (0, exports.createUploader)("projects");
exports.uploadTask = (0, exports.createUploader)("projects");
exports.uploadVoice = (0, exports.createUploader)("voices");
