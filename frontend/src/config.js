// Empty (or unset) means "same origin": in development the Vite proxy forwards /api to the backend.
export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

// Injected by vite.config.js from package.json.
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';

export const STATUS_POLL_MS = 30_000;
