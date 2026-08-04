import { Router } from "express";
import { getAllJobs, getJobById, createJob, updateJob, deleteJob, createJobSchema, updateJobSchema, JobIdSchema } from "../../controllers/admin/jobs";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";

const route = Router();

route.get("/", catchAsync(getAllJobs));
route.get("/:id", validate(JobIdSchema), catchAsync(getJobById));
route.post("/", validate(createJobSchema), catchAsync(createJob));
route.put("/:id", validate(updateJobSchema), catchAsync(updateJob));
route.delete("/:id", validate(JobIdSchema), catchAsync(deleteJob));

export default route;
