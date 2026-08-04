import { Router } from "express";
import { getPayroll } from "../../controllers/admin/payroll";

const router = Router();

router.get("/", getPayroll);

export default router;
