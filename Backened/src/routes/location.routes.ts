import { Router } from 'express';
import * as locationController from '../controllers/location.controller';

const router = Router();

/**
 * Location Routes
 * /api/v1/location
 * 
 * All routes are public (no authentication required)
 * for location features used in complaint submission
 */

router.post('/reverse-geocode', locationController.reverseGeocode); // Reverse geocode (coordinates -> address)
router.post('/forward-geocode', locationController.forwardGeocode); // Forward geocode (address -> coordinates)
router.post('/validate', locationController.validateLocation); // Validate location
router.post('/distance', locationController.calculateDistance); // Calculate distance

export default router;

