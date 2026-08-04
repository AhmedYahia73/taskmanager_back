import { Router } from "express";
import { getActiveJobs, getActiveCities, getActiveQualifications, submitApplication } from "../../controllers/public/careers";
import { catchAsync } from "../../utils/catchAsync";
import multer from "multer";
import path from "path";

// Setup multer for CV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/cvs');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  }
});

const route = Router();

route.get("/jobs", catchAsync(getActiveJobs));
route.get("/cities", catchAsync(getActiveCities));
route.get("/qualifications", catchAsync(getActiveQualifications));
route.post("/apply", upload.single('upload_cv'), catchAsync(submitApplication));

export default route;
