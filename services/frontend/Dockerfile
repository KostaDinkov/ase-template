# syntax=docker/dockerfile:1

# ── Base ──────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app
RUN addgroup --system app && adduser --system --ingroup app app

# ── Dependencies ──────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ── Development ───────────────────────────────────────────────────────────────
FROM deps AS development
COPY --chown=app:app . .
USER app
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ── Builder ───────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY --chown=app:app . .
RUN npm run build

# ── Production ────────────────────────────────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production
COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/.next ./.next
COPY --from=builder --chown=app:app /app/public ./public
COPY --chown=app:app package.json .
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["npm", "start"]
