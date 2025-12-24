/**
 * Location Service
 * Maps to backend /api/v1/location routes
 * All routes are public (no authentication required)
 */

import apiClient from '@/lib/api';
import { ApiResponse, LocationCoordinates, GeocodeResponse, ReverseGeocodeRequest } from '@/types';

export const locationService = {
  /**
   * Reverse geocode (coordinates -> address)
   * POST /api/v1/location/reverse-geocode
   * Backend expects { lat, lon } format
   */
  async reverseGeocode(coordinates: ReverseGeocodeRequest): Promise<GeocodeResponse> {
    // Transform { latitude, longitude } to { lat, lon } for backend
    const backendFormat = {
      lat: coordinates.latitude,
      lon: coordinates.longitude,
    };
    const response = await apiClient.post<ApiResponse<GeocodeResponse>>('/location/reverse-geocode', backendFormat);
    return response.data;
  },

  /**
   * Forward geocode (address -> coordinates)
   * POST /api/v1/location/forward-geocode
   */
  async forwardGeocode(address: string): Promise<LocationCoordinates> {
    const response = await apiClient.post<ApiResponse<LocationCoordinates>>('/location/forward-geocode', { address });
    return response.data;
  },

  /**
   * Validate location
   * POST /api/v1/location/validate
   */
  async validateLocation(location: LocationCoordinates | string): Promise<{ valid: boolean; message?: string }> {
    const payload = typeof location === 'string' ? { address: location } : location;
    const response = await apiClient.post<ApiResponse<{ valid: boolean; message?: string }>>('/location/validate', payload);
    return response.data;
  },

  /**
   * Calculate distance between two locations
   * POST /api/v1/location/distance
   */
  async calculateDistance(
    from: LocationCoordinates,
    to: LocationCoordinates
  ): Promise<{ distance: number; unit: string }> {
    const response = await apiClient.post<ApiResponse<{ distance: number; unit: string }>>('/location/distance', {
      from,
      to,
    });
    return response.data;
  },
};

