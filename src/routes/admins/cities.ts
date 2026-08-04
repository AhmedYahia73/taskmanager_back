import { Router } from "express";
import { getAllCities, getCityById, createCity, updateCity, deleteCity, createCitySchema, updateCitySchema, CityIdSchema } from "../../controllers/admin/cities";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";

const route = Router();

route.get("/", catchAsync(getAllCities));
route.get("/:id", validate(CityIdSchema), catchAsync(getCityById));
route.post("/", validate(createCitySchema), catchAsync(createCity));
route.put("/:id", validate(updateCitySchema), catchAsync(updateCity));
route.delete("/:id", validate(CityIdSchema), catchAsync(deleteCity));

export default route;
