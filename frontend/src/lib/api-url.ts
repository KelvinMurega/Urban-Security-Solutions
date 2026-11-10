'use client';

// In production the API URL must be configured explicitly (NEXT_PUBLIC_API_URL, https).
// The hostname:5000 fallback exists only for local/LAN development.
export const resolveApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('NEXT_PUBLIC_API_URL is not configured.');
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }

  return 'http://localhost:5000';
};
