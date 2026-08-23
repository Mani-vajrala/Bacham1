// Central API and Backend URL configuration with auto-sanitization
const rawUrl = (import.meta.env.VITE_BACKEND_URL || '').trim();

let sanitizedUrl = rawUrl.replace(/\/+$/, '');
if (sanitizedUrl && !sanitizedUrl.startsWith('http://') && !sanitizedUrl.startsWith('https://')) {
  sanitizedUrl = `https://${sanitizedUrl}`;
}

export const BACKEND_URL = sanitizedUrl;
export const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';
