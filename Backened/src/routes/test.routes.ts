import { Router } from "express";
import * as testController from "../controllers/test.controller";

const router = Router();

/**
 * Test Routes
 * /api/v1/test
 * Auth-free routes for testing purposes
 */

// Public routes (no authentication required)
router.get("/admins", testController.getAllAdmins); // Get all admin users
router.post("/create-admin", testController.createAdmin); // Create admin user
router.get("/complaints", testController.getAllComplaints); // Get all complaints data
router.post("/heatmap", testController.createHeatMap); // Create or update heat map data
router.post("/administrative-head", testController.createAdministrativeHead); // Create or update district administrative head data
router.post("/demographic-religion", testController.createDemographicReligion); // Create or update demographic religion data
router.post("/demographic-caste", testController.createDemographicCaste); // Create or update demographic caste data

export default router;
