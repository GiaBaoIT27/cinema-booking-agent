# syntax=docker/dockerfile:1
# ── Build: tsc → dist/ (ESM, NodeNext) ──────────────────────────
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Runtime: chỉ deps production + dist/ ─────────────────────────
FROM node:24-bookworm-slim AS runner
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

EXPOSE 3002
# Bắt buộc GOOGLE_API_KEY + BACKEND_API_URL (compose set BACKEND_API_URL
# nội mạng thành http://backend:3000/api/v1).
CMD ["node", "dist/server.js"]
