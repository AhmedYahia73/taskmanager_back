import { Router } from "express";
import { getAllSalaries, getSalaryById, createSalary, updateSalary, deleteSalary } from "../../controllers/admin/salaries";
import { catchAsync } from "../../utils/catchAsync";

const route = Router();

route.get("/", catchAsync(getAllSalaries));
route.get("/:id", catchAsync(getSalaryById));
route.post("/", catchAsync(createSalary));
route.put("/:id", catchAsync(updateSalary));
route.delete("/:id", catchAsync(deleteSalary));

export default route;
