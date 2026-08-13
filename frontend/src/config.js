// Central API and Backend URL configuration
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
export const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';
