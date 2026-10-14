import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { v4 as uuidv4 } from "uuid";

// Helper function to create multer instance for a specific uploads subfolder
export const createUploader = (folder: string) => {
  const uploadDir = path.resolve(__dirname, "../../uploads", folder);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".png";
      const fileName = `${uuidv4()}${ext}`;
      cb(null, fileName);
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB maximum file size
    },
  });
};

// Helper function to generate accessible URL for an uploaded file
export const getFileUrl = (
  req: Request,
  file: Express.Multer.File,
  folder?: string
): string => {
  const filename = file.filename;
  let subfolder = folder;
  if (!subfolder && file.destination) {
    subfolder = path.basename(file.destination);
  }
  const relativePath = subfolder ? `uploads/${subfolder}/${filename}` : `uploads/${filename}`;
  return `${req.protocol}://${req.get("host")}/${relativePath}`;
};

// Helper function for Zod to parse arrays that may arrive as strings (e.g. from FormData)
export const parseArray = (val: unknown) => {
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    if (val.trim() === "") return [];
    return [val];
  }
  if (Array.isArray(val)) return val;
  return val;
};

// Pre-configured uploaders for application modules
export const uploadAdmin = createUploader("admins");
export const uploadUser = createUploader("Users");
export const uploadCompany = createUploader("companies");
export const uploadProject = createUploader("projects");
export const uploadProjectGroup = createUploader("projects");
export const uploadTask = createUploader("projects");
