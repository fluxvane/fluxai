# syntax=docker/dockerfile:1

# ============================================
# Stage 1: Install dependencies (with dev for build)
# ============================================
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --no-frozen-lockfile

# ============================================
# Stage 2: Build
# ============================================
FROM node:22-alpine AS builder
WORKDIR /app
ARG VERSION=dev
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm install -g pnpm

COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Ensure public dir exists (may not be present in all environments)
RUN mkdir -p /app/public

# Environment selection
RUN case "$VERSION" in \
  uat) if [ -f .env.uat ]; then cat .env.uat > .env && rm -f .env.production .env.development .env.local; fi ;; \
  latest|prod|production) if [ -f .env.production ]; then cat .env.production > .env && rm -f .env.development .env.uat .env.local; fi ;; \
  *) if [ -f .env.development ]; then cat .env.development > .env && rm -f .env.production .env.uat .env.local; fi ;; \
  esac

RUN pnpm build

# ============================================
# Stage 3: Production runtime (with prod deps only)
# ============================================
FROM node:22-alpine AS deps-prod
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --no-frozen-lockfile --prod

# ============================================
# Stage 4: Final image
# ============================================
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache dumb-init \
  && addgroup -g 1001 -S nextjs \
  && adduser -S nextjs -u 1001 -G nextjs

ENV NODE_ENV=production \
  PORT=3000 \
  HOSTNAME=0.0.0.0 \
  NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next ./.next
COPY --from=deps-prod --chown=nextjs:nextjs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nextjs /app/package.json ./package.json

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode < 400 ? 0 : 1)})" || exit 1

CMD ["dumb-init", "node_modules/.bin/next", "start", "-p", "3000"]
