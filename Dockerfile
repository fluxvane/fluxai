# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./

ENV npm_config_ignore_scripts=true

RUN npm ci --legacy-peer-deps

# Stage 2: Build the app
FROM node:22-alpine AS builder
WORKDIR /app

ARG ENV_FILE=.env

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN if [ -f "${ENV_FILE}" ] && [ "${ENV_FILE}" != ".env" ]; then cp "${ENV_FILE}" .env; fi

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
# Ensure public dir exists (may not be present in all environments)
RUN mkdir -p /app/public

# Stage 3: Production runtime
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=3008
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

COPY package*.json ./

EXPOSE 3008

CMD ["dumb-init", "node", "server.js"]
