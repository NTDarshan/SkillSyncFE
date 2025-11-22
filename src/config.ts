/**
 * Environment configuration accessors.
 * Centralizes reading of environment variables and provides helpers for API URLs.
 */

interface EnvVars {
  VITE_API_BASE_URL?: string;
}

export const API_BASE_URL: string = ((import.meta as unknown as { env?: EnvVars }).env?.VITE_API_BASE_URL) ?? 'http://127.0.0.1:8000';

/**
 * Builds a full API URL from a path, respecting the configured base URL.
 */
export const getApiUrl = (path: string): string => {
  try {
    return new URL(path, API_BASE_URL).toString();
  } catch {
    return `${API_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }
};