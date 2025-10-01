import { DefaultApi, Configuration } from './generated';

// Determine API base URL with sensible defaults for different environments.
// Priority:
// 1) Explicit environment variable REACT_APP_API_BASE_URL (set at build time for CRA).
// 2) Runtime global window.__TEMPMON_API_BASE__ if provided (can be injected into index.html).
// 3) Same host as the frontend, but with backend port 9247.
const resolveBasePath = (): string => {
  const envUrl = process.env.REACT_APP_API_BASE_URL;
  if (envUrl && envUrl.trim().length > 0) return envUrl;

  // @ts-ignore allow optional runtime override
  const runtimeUrl = (typeof window !== 'undefined' && (window as any).__TEMPMON_API_BASE__) as string | undefined;
  if (runtimeUrl && runtimeUrl.trim().length > 0) return runtimeUrl;

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    // Always point to backend port 9247 on the same host by default
    return `${protocol}//${hostname}:9247`;
  }

  // Fallback for non-browser contexts
  return 'http://localhost:9247';
};

const basePath = resolveBasePath();

export const apiClient = new DefaultApi(new Configuration({ basePath }));