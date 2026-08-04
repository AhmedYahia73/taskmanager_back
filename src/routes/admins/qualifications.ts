import { Router } from "express";
import { getAllQualifications, getQualificationById, createQualification, updateQualification, deleteQualification, createQualificationSchema, updateQualificationSchema, QualificationIdSchema } from "../../controllers/admin/qualifications";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";

const route = Router();

route.get("/", catchAsync(getAllQualifications));
route.get("/:id", validate(QualificationIdSchema), catchAsync(getQualificationById));
route.post("/", validate(createQualificationSchema), catchAsync(createQualification));
route.put("/:id", validate(updateQualificationSchema), catchAsync(updateQualification));
route.delete("/:id", validate(QualificationIdSchema), catchAsync(deleteQualification));

export default route;
