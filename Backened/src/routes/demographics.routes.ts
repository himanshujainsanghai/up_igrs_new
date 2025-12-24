import { Router } from "express";
import * as demographicsController from "../controllers/demographics.controller";
import * as geocodingController from "../controllers/geocoding.controller";

const router = Router();

/**
 * Demographics Routes
 * /api/v1/demographics
 * Routes for census demographic data (Census 2011)
 */

// Subdistrict routes (specific before parameterized)
router.get("/subdistricts", demographicsController.getAllSubdistricts);
router.get("/subdistrict/:subdistrictLgd", demographicsController.getSubdistrictDemographicsById);
router.get("/subdistrict/:subdistrictLgd/village-count", demographicsController.getSubdistrictVillageCountById);

// District routes
router.get("/district/:districtLgd", demographicsController.getDistrictDemographicsById);

// Village routes
router.get("/village/:villageCode", demographicsController.getVillageDemographicsById);
router.get("/village/:villageCode/summary", demographicsController.getVillageDemographicsSummaryById);

// Town routes
router.get("/towns", demographicsController.getTowns);
router.get("/town/:townCode/summary", demographicsController.getTownDemographicsSummaryById);

// Ward routes
router.get("/wards", demographicsController.getWards);

// Search routes
router.get("/search/villages", demographicsController.searchVillages);

// Geocoding routes
router.post("/geocode-towns", geocodingController.geocodeTowns);
router.post("/geocode-wards", geocodingController.geocodeWards);
router.get("/geocoding-status", geocodingController.getGeocodingStatus);

export default router;

