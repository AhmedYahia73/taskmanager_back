import express from "express";
import path from "path";
import ApiRoute from "./routes";
import { errorHandler } from "./middlewares/errorHandler";
import { NotFound } from "./Errors";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet"; 
import http from "http";
import { initSocket } from "./socket";
import { setupSwagger } from "./config/swagger"; // 👈 1. استيراد دالة Swagger هنا

dotenv.config();

const app = express();

const httpServer = http.createServer(app);
const io = initSocket(httpServer);

// ✅ CORS configuration supporting custom headers
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "x-sales-project-id",
    "x-project-id"
  ],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// 📝 2. تفعيل واجهة Swagger (يُفضل وضعها قبل الـ Routes الأساسية للمشروع)
setupSwagger(app);

app.get("/api/test", (req, res, next) => {
  res.json({ message: "API is working! notify token" });
});

app.use("/api", ApiRoute);

app.use((req, res, next) => {
  throw new NotFound("Route not found");
});

app.use(errorHandler);
 

// 🚀 تشغيل الخادم على البورت المحدد
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});