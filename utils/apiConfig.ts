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
  // Priority 1: Use environment variable if set
  const envUrl = (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }

  // Priority 2: Use current hostname (works for network access)
  // This allows devices on the network to connect automatically
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // If accessing from localhost, use localhost for API
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:2000';
    }
    
    // Otherwise, use the same hostname with port 2000
    // This works when accessing via IP (e.g., 192.168.1.100:3000 -> 192.168.1.100:2000)
    return `${protocol}//${hostname}:2000`;
  }

  // Priority 3: Fallback to localhost (for SSR or edge cases)
  return 'http://localhost:2000';
}

/**
 * Build a full URL from an API path
 */
export function buildApiUrl(path: string): string {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

