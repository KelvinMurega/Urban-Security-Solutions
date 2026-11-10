# syntax=docker/dockerfile:1.7
# ---------- build ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* values and rewrites are baked in at build time.
ARG NEXT_PUBLIC_API_URL=same-origin
ARG API_PROXY_TARGET=http://backend:5000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    API_PROXY_TARGET=$API_PROXY_TARGET \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- runtime: standalone server, non-root ----------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/privacy').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# JWT_SECRET must be provided at runtime (same value as the API) for the route guard.
CMD ["node", "server.js"]
