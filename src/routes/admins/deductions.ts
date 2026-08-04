import { Router } from "express";
import {
  getDeductions,
  createDeduction,
  updateDeduction,
  deleteDeduction,
} from "../../controllers/admin/deductions";

const router = Router();

router.get("/", getDeductions);
router.post("/", createDeduction);
router.put("/:id", updateDeduction);
router.delete("/:id", deleteDeduction);

export default router;
