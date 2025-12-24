import { Router } from "express";
import * as geoController from "../controllers/geo.controller";

const router = Router();

/**
 * Geo Routes
 * /api/v1/geo
 * Routes for geographic data
 */

// Specific routes first
router.get("/uttarpradesh", geoController.getUPGeoJson);
router.get("/badaun", geoController.getBadaunGeoJson);

// Heat map routes (specific routes before parameterized)
router.get("/heatmap/districts", geoController.getAllDistrictsHeatMap); // Get all districts with heat values
router.get("/heatmap/:districtCode", geoController.getDistrictHeatMapById); // Get full heat map data by districtCode

// POI routes (Points of Interest) - parameterized route
// GET /api/v1/geo/:district/:poi
// Examples: /badaun/adhq, /badaun/india-assets
router.get("/:district/:poi", geoController.getDistrictPOI);

export default router;
