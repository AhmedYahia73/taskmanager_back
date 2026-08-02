import { Router } from "express";
import { getAllZones, createZone, updateZone, deleteZone, getZonesList } from "../../controllers/admin/zones";

const route = Router();

route.get("/lists", getZonesList);
route.get("/", getAllZones);
route.post("/", createZone);
route.put("/:id", updateZone);
route.delete("/:id", deleteZone);

export default route;
