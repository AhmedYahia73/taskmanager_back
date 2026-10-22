import { Router } from "express";
import {
  getAllWishLists,
  lists,
  getWishListsById,
  createWishLists,
  updateWishLists,
  deleteWishLists,
  convertWishListToVisit,
} from "../../../controllers/admin/sales/wishlist";
import { catchAsync } from "../../../utils/catchAsync";
import { resolveSalesProject } from "../../../middlewares/resolveSalesProject";

const router = Router();
router.use(resolveSalesProject);

router.get("/lists", catchAsync(lists));
router.get("/sales/lists", catchAsync(lists));
router.get("/", catchAsync(getAllWishLists));
router.post("/:id/convert", catchAsync(convertWishListToVisit));
router.post("/convert/:id", catchAsync(convertWishListToVisit));
router.get("/:id", catchAsync(getWishListsById));
router.post("/", catchAsync(createWishLists));
router.put("/:id", catchAsync(updateWishLists));
router.delete("/:id", catchAsync(deleteWishLists));

export default router;
