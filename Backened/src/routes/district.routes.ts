import { Router } from "express";
import * as districtController from "../controllers/district.controller";

const router = Router();

// Public routes
router.get("/badaun", districtController.getBadaunDistrict);

export default router;

