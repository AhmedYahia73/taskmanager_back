import { Router } from "express";
import { getAllShifts, createShift, updateShift, deleteShift } from "../../controllers/admin/shifts";

const route = Router();

route.get("/", getAllShifts);
route.post("/", createShift);
route.put("/:id", updateShift);
route.delete("/:id", deleteShift);

export default route;
