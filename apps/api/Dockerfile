# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /mono

# Install build tools for native addons
RUN apk add --no-cache python3 make g++

# Copy workspace manifests
COPY package.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/

# Copy lockfile
COPY package-lock.json ./

# Install all dependencies (including devDependencies for the build)
RUN npm ci --ignore-scripts

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /mono

COPY --from=deps /mono/node_modules ./node_modules

# Copy source
COPY tsconfig.base.json ./
COPY packages/types ./packages/types
COPY apps/api ./apps/api

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build types package
RUN cd packages/types && npx tsc -p tsconfig.build.json 2>/dev/null || true

# Build API
RUN cd apps/api && npm run build

# ─── Stage 3: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -S vybeon && adduser -S vybeon -G vybeon

# Copy compiled output
COPY --from=builder /mono/apps/api/dist ./dist/
COPY --from=builder /mono/apps/api/prisma ./prisma/
COPY --from=builder /mono/node_modules ./node_modules/
COPY --from=builder /mono/apps/api/package.json ./package.json

# Overlay compiled types package so @vybeon/types resolves at runtime
RUN mkdir -p ./node_modules/@vybeon/types
COPY --from=builder /mono/packages/types ./node_modules/@vybeon/types/

# Re-generate Prisma client in production environment
RUN npx prisma generate

# Use non-root user
USER vybeon

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]
