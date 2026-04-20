// Base URL for the backend REST API.
// Override by setting EXPO_PUBLIC_API_BASE_URL in your .env file.
export const BASE_URL =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_BASE_URL) ||
  'http://localhost:8000/api';
