// src/routes/admins/notifications.ts

import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  registerFCMToken,
  testFCM,
} from "../../controllers/admin/notifications";
import { catchAsync } from "../../utils/catchAsync";

const route = Router();

route.get("/", catchAsync(getNotifications));
route.post("/fcm-token", catchAsync(registerFCMToken));
route.post("/test-fcm", catchAsync(testFCM));
route.put("/read-all", catchAsync(markAllAsRead));
route.put("/:id/read", catchAsync(markAsRead));
route.delete("/:id", catchAsync(deleteNotification));

export default route;
