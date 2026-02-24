/**
 * API Configuration Utility
 * 
 * Automatically determines the API base URL based on:
 * 1. VITE_API_BASE_URL environment variable (if set)
 * 2. Current window hostname (for network access from other devices)
 * 3. Fallback to localhost:2000 (for same-machine access)
 * 
 * This allows the app to work from any device on the network without
 * hardcoding IP addresses.
 */

/**
 * Get the API base URL, automatically detecting the server address
 * based on the current hostname.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // When opening from another PC (e.g. http://192.168.110.166:3000), always use
    // the same host so API calls go to the server, not to that PC's localhost.
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${protocol}//${hostname}:2000`;
    }

    // On same machine (localhost): use env if set, else localhost:2000
    const envUrl = (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL;
    if (envUrl) {
      return envUrl;
    }
    return 'http://localhost:2000';
  }

  // SSR or no window: use env or fallback
  const envUrl = (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL;
  return envUrl || 'http://localhost:2000';
}

/**
 * Build a full URL from an API path
 */
export function buildApiUrl(path: string): string {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

