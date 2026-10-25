// src/routes/admins/userOnlineDays.ts

import { Router } from "express";
import {
  getUsersOnlineDays,
  updateUsersOnlineDays,
} from "../../controllers/admin/userOnlineDays";
import { catchAsync } from "../../utils/catchAsync";

const route = Router();

route.get("/", catchAsync(getUsersOnlineDays));
route.put("/", catchAsync(updateUsersOnlineDays));

export default route;
