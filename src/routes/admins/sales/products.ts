import { Router } from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../../controllers/admin/sales/products";
import { catchAsync } from "../../../utils/catchAsync";
import { resolveSalesProject } from "../../../middlewares/resolveSalesProject";

const router = Router();
router.use(resolveSalesProject);

router.get("/", catchAsync(getAllProducts));
router.get("/:id", catchAsync(getProductById));
router.post("/", catchAsync(createProduct));
router.put("/:id", catchAsync(updateProduct));
router.delete("/", catchAsync(deleteProduct));
router.delete("/:id", catchAsync(deleteProduct));

export default router;
