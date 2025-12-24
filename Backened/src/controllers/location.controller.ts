import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as locationService from '../services/location.service';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';
import logger from '../config/logger';

/**
 * Location Controller
 * Handles location-related requests
 */

/**
 * POST /api/v1/location/reverse-geocode
 * Reverse geocode coordinates to address
 */
export const reverseGeocode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { lat, lon } = req.body;

    if (lat === undefined || lon === undefined) {
      throw new ValidationError('Latitude and longitude are required');
    }

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (isNaN(latNum) || isNaN(lonNum)) {
      throw new ValidationError('Invalid coordinates. Must be valid numbers.');
    }

    const result = await locationService.reverseGeocode({
      lat: latNum,
      lon: lonNum,
    });

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/location/forward-geocode
 * Forward geocode address to coordinates
 */
export const forwardGeocode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { address, limit } = req.body;

    if (!address || typeof address !== 'string') {
      throw new ValidationError('Address is required and must be a string');
    }

    const results = await locationService.forwardGeocode({
      address,
      limit: limit ? parseInt(limit) : 5,
    });

    sendSuccess(res, {
      results,
      count: results.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/location/validate
 * Validate location (coordinates or address)
 */
export const validateLocation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { lat, lon, address } = req.body;

    const options: any = {};
    if (lat !== undefined) options.lat = parseFloat(lat);
    if (lon !== undefined) options.lon = parseFloat(lon);
    if (address) options.address = address;

    const result = await locationService.validateLocation(options);

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/location/distance
 * Calculate distance between two coordinates
 */
export const calculateDistance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { lat1, lon1, lat2, lon2, unit } = req.body;

    if (
      lat1 === undefined ||
      lon1 === undefined ||
      lat2 === undefined ||
      lon2 === undefined
    ) {
      throw new ValidationError('All coordinates (lat1, lon1, lat2, lon2) are required');
    }

    const distance = locationService.calculateDistance({
      lat1: parseFloat(lat1),
      lon1: parseFloat(lon1),
      lat2: parseFloat(lat2),
      lon2: parseFloat(lon2),
      unit: unit || 'km',
    });

    sendSuccess(res, {
      distance,
      unit: unit || 'km',
      coordinates: {
        from: { lat: parseFloat(lat1), lon: parseFloat(lon1) },
        to: { lat: parseFloat(lat2), lon: parseFloat(lon2) },
      },
    });
  } catch (error) {
    next(error);
  }
};

