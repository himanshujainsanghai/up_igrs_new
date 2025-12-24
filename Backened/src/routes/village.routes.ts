import { Router } from "express";
import * as villageController from "../controllers/village.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Public routes - village data access
router.get("/test-geocoding", villageController.testGeocoding);
router.get("/badaun/geojson", villageController.getBadaunVillagesGeoJSON);
router.get("/badaun/boundaries", villageController.getBadaunVillageBoundaries);
router.get("/badaun/stats", villageController.getBadaunVillageStats);
router.get("/stats", villageController.getVillageStats);
router.get("/:lgdCode/complaints", villageController.getVillageComplaints);
router.get("/:lgdCode", villageController.getVillageByLgdCode);
router.get("/:districtLgd/geojson", villageController.getVillagesGeoJSONByDistrict);

// Protected routes - data management
router.post("/geocode", authenticate, villageController.triggerGeocoding);
router.post("/upload", authenticate, villageController.uploadVillageData);
router.get("/", authenticate, villageController.getAllVillages);

export default router;

