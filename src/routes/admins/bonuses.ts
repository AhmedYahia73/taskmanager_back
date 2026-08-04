import { Router } from "express";
import {
  getBonuses,
  createBonus,
  updateBonus,
  deleteBonus,
} from "../../controllers/admin/bonuses";

const router = Router();

router.get("/", getBonuses);
router.post("/", createBonus);
router.put("/:id", updateBonus);
router.delete("/:id", deleteBonus);

export default router;
