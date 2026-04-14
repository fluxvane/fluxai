# syntax=docker/dockerfile:1

# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
COPY nera-common ./nera-common

# Rewrite local dependency path for Docker context
RUN sed -i 's|"link:../nera-common"|"link:./nera-common"|' package.json \
    && sed -i 's|\.\./nera-common|./nera-common|g' pnpm-lock.yaml

# Build @nera/common first
RUN cd nera-common && pnpm install --no-frozen-lockfile && pnpm build && rm -rf node_modules

RUN pnpm install --no-frozen-lockfile

# ============================================
# Stage 2: Build
# ============================================
FROM node:22-alpine AS builder
WORKDIR /app
ARG VERSION=dev
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
# Ensure public dir exists (may not be present in all environments)
RUN mkdir -p /app/public

RUN npm install -g pnpm

COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Environment selection
RUN case "$VERSION" in \
  uat) [ -f .env.uat ] && cat .env.uat > .env && rm -f .env.production .env.development .env.local ;; \
  latest|prod|production) [ -f .env.production ] && cat .env.production > .env && rm -f .env.development .env.uat .env.local ;; \
  *) [ -f .env.development ] && cat .env.development > .env && rm -f .env.production .env.uat .env.local ;; \
  esac

RUN pnpm build

# ============================================
# Stage 3: Production runtime
# ============================================
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache dumb-init \
  && addgroup -g 1001 -S nextjs \
  && adduser -S nextjs -u 1001 -G nextjs

ENV NODE_ENV=production \
  PORT=3000 \
  NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode < 400 ? 0 : 1)})" || exit 1

CMD ["dumb-init", "node", "server.js"]
