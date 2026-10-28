# syntax=docker/dockerfile:1
# ── Build: nest build (tsc) → dist/ ─────────────────────────────
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm install
COPY . .
RUN npm run build
RUN npm prune --omit=dev

# ── Runtime: chỉ deps production + dist/ ─────────────────────────
FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=development
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 3000
# TypeORM synchronize=true (NODE_ENV != production) tự tạo schema khi khởi động.
# Seed: docker compose run --rm backend node -r dotenv/config dist/database/seeds/run-seed.js
CMD ["node", "dist/main.js"]
