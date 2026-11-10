'use client';

// NEXT_PUBLIC_API_URL:
//   "same-origin"              -> API is proxied through this app (/api, /uploads); recommended
//   "https://api.example.com"  -> separate API domain
//   unset                      -> local/LAN development only: http(s)://<this host>:5000
export const resolveApiUrl = () => {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured === 'same-origin') return '';
  if (configured) return configured.replace(/\/+$/, '');

  if (process.env.NODE_ENV === 'production') {
    console.error('NEXT_PUBLIC_API_URL is not configured.');
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }

  return 'http://localhost:5000';
};
