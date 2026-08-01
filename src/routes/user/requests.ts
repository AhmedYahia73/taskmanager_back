import { Router } from "express";
import { submitHolidayRequest, submitOnlineRequest, submitPermission } from "../../controllers/user/requests";
import { authenticated } from "../../middlewares/authenticated";

const requestRouter = Router();

// Apply auth middleware for user
requestRouter.use(authenticated);

requestRouter.post("/holiday", submitHolidayRequest);
requestRouter.post("/online", submitOnlineRequest);
requestRouter.post("/permission", submitPermission);

export default requestRouter;
