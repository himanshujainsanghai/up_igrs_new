/**
 * Google Maps Configuration
 * Handles Google Maps API key and configuration
 */

// Get Google Maps API key from environment variable
// In Vite, environment variables must be prefixed with VITE_
export const GOOGLE_MAPS_API_KEY = 'AIzaSyAhVSa9dUXWZVG9wKlDPM-3LNg1U84unz8';

// Default map center (India)
export const DEFAULT_MAP_CENTER = {
  lat: 20.5937,
  lng: 78.9629,
};

// Default map zoom level
export const DEFAULT_MAP_ZOOM = 5;

// Map options
export const MAP_OPTIONS = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: true,
};

