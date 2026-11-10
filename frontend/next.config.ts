import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

// Two deployment modes:
//  1. Same-origin proxy (recommended): set API_PROXY_TARGET (e.g. http://backend:5000) and
//     NEXT_PUBLIC_API_URL=same-origin at BUILD time. The browser only ever talks to the
//     frontend's domain, so the session cookie, CSP and CORS are trivially correct.
//  2. Separate API domain: set NEXT_PUBLIC_API_URL=https://api.example.com (same parent
//     domain as the app, with COOKIE_DOMAIN set on the API).
const proxyTarget = process.env.API_PROXY_TARGET?.replace(/\/+$/, "");

const apiOrigin = (() => {
  try {
    const value = process.env.NEXT_PUBLIC_API_URL;
    return value && value !== "same-origin" ? new URL(value).origin : "";
  } catch {
    return "";
  }
})();

// Strict Content-Security-Policy in production: only our own origin and the API may be
// contacted, nothing may frame the app, and plugins/base-tag/form hijacking are blocked.
// ('unsafe-inline' scripts are required by Next.js hydration without a nonce setup.)
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${apiOrigin}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}`.trim(),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Geolocation is needed for GPS check-in/out; camera for incident photos. Nothing else.
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(self), microphone=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProduction
    ? [
        { key: "Content-Security-Policy", value: contentSecurityPolicy },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      ]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone", // minimal self-contained server for the Docker image
  poweredByHeader: false,
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    if (!proxyTarget) return [];
    return [
      { source: "/api/:path*", destination: `${proxyTarget}/api/:path*` },
      { source: "/uploads/:path*", destination: `${proxyTarget}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
