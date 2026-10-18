"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePhotoFromServer = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const deletePhotoFromServer = async (imageUrlOrPath) => {
    try {
        // استخراج المسار النسبي من الـ URL أو استخدامه مباشرة
        let relativePath = imageUrlOrPath;
        // لو كان URL كامل، نستخرج المسار
        if (imageUrlOrPath.startsWith("http")) {
            const url = new URL(imageUrlOrPath);
            relativePath = url.pathname.startsWith("/")
                ? url.pathname.slice(1)
                : url.pathname;
        }
        if (relativePath.startsWith("/")) {
            relativePath = relativePath.slice(1);
        }
        relativePath = decodeURIComponent(relativePath);
        const candidates = [
            path_1.default.resolve(process.cwd(), relativePath),
            path_1.default.join(__dirname, "../..", relativePath),
            path_1.default.join(__dirname, "../../..", relativePath),
        ];
        for (const filePath of candidates) {
            try {
                await promises_1.default.access(filePath);
                await promises_1.default.unlink(filePath);
                return true;
            }
            catch {
                // try next candidate
            }
        }
        return false;
    }
    catch (err) {
        console.error("Error deleting photo:", err);
        return false; // لا نرمي خطأ، فقط نرجع false
    }
};
exports.deletePhotoFromServer = deletePhotoFromServer;
