/**
 * Global type declarations
 * Prevents TypeScript errors for implicit type libraries
 */

// Declare dom-speech-recognition module to prevent TypeScript error
declare module 'dom-speech-recognition' {
  // Empty declaration to suppress implicit type library error
  export {};
}

// Google Maps global declaration
declare global {
  interface Window {
    google: typeof google;
  }
}

