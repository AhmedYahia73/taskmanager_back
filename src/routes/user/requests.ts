import { Router } from "express";
import {
  submitHolidayRequest,
  submitOnlineRequest,
  submitPermission,
  submitExtraTimeRequest,
  getMyExtraTimeRequests,
} from "../../controllers/user/requests";
import { authenticated } from "../../middlewares/authenticated";

const requestRouter = Router();

// Apply auth middleware for user
requestRouter.use(authenticated);

requestRouter.post("/holiday", submitHolidayRequest);
requestRouter.post("/online", submitOnlineRequest);
requestRouter.post("/permission", submitPermission);
requestRouter.post("/extra-time", submitExtraTimeRequest);
requestRouter.get("/extra-time", getMyExtraTimeRequests);

export default requestRouter;
