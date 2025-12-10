###########################
#     BASE CONTAINER      #
###########################
FROM node:22-slim AS base

# Instalar dependencias básicas
RUN apt-get update && apt-get install -y \
  openssl \
  fonts-freefont-ttf \
  fontconfig \
  wget \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*


###########################
#    BUILDER CONTAINER    #
###########################
FROM base AS builder

# Instalar dependencias de build
RUN apt-get update && apt-get install -y \
  jq \
  libc6-dev \
  make \
  g++ \
  cmake \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

# ⭐ COPY CERTS BEFORE TURBO PRUNE
COPY apps/certs ./apps/certs

RUN npm install -g "turbo@^1.9.3"
RUN turbo prune --scope=@documenso/remix --docker


###########################
#   INSTALLER CONTAINER   #
###########################
FROM base AS installer

RUN apt-get update && apt-get install -y \
  jq \
  make \
  cmake \
  g++ \
  openssl \
  bash \
  libc6-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV HUSKY=0
ENV DOCKER_OUTPUT=1
ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PRIVATE_ENCRYPTION_KEY="CAFEBABE"
ENV NEXT_PRIVATE_ENCRYPTION_KEY="$NEXT_PRIVATE_ENCRYPTION_KEY"

ARG NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY="DEADBEEF"
ENV NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY="$NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY"

COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
COPY --from=builder /app/lingui.config.ts ./lingui.config.ts
COPY --from=builder /app/patches ./patches

# ⭐ Copy certs
COPY --from=builder /app/apps/certs ./apps/certs

RUN npm ci

COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json
RUN npm install -g "turbo@^1.9.3"
RUN turbo run build --filter=@documenso/remix...


###########################
#     RUNNER CONTAINER    #
###########################
FROM base AS runner

ENV HUSKY=0
ENV DOCKER_OUTPUT=1

ARG NEXT_PRIVATE_TELEMETRY_KEY=""
ENV NEXT_PRIVATE_TELEMETRY_KEY="$NEXT_PRIVATE_TELEMETRY_KEY"

ARG NEXT_PRIVATE_TELEMETRY_HOST=""
ENV NEXT_PRIVATE_TELEMETRY_HOST="$NEXT_PRIVATE_TELEMETRY_HOST"

# Instalar Chromium y dependencias para Playwright
RUN apt-get update && apt-get install -y \
  chromium-common \
  chromium-sandbox \
  chromium-driver \
  libnss3 \
  libxss1 \
  libasound2 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf-2.0-0 \
  libgtk-3-0 \
  fonts-freefont-ttf \
  fontconfig \
  wget \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_BROWSERS_PATH=/usr/lib/chromium/
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0

# Crear usuario nodejs con home y permisos correctos
RUN groupadd --gid 1001 nodejs \
    && useradd --uid 1001 --gid 1001 --create-home --home-dir /home/nodejs --shell /bin/bash nodejs \
    && mkdir -p /home/nodejs /app \
    && chown -R nodejs:nodejs /home/nodejs /app

USER nodejs

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/out/json/ .
COPY --from=builder --chown=nodejs:nodejs /app/out/full/packages/tailwind-config ./packages/tailwind-config
COPY --from=builder --chown=nodejs:nodejs /app/patches ./patches

# ⭐ Certs en la imagen final
COPY --from=builder --chown=nodejs:nodejs /app/apps/certs ./certs

# Instalar dependencias sin dev y sin problemas de permisos
RUN npm ci --only=production

COPY --from=installer --chown=nodejs:nodejs /app/apps/remix/build ./apps/remix/build
COPY --from=installer --chown=nodejs:nodejs /app/apps/remix/public ./apps/remix/public

COPY --from=installer --chown=nodejs:nodejs /app/packages/prisma/schema.prisma ./packages/prisma/schema.prisma
COPY --from=installer --chown=nodejs:nodejs /app/packages/prisma/migrations ./packages/prisma/migrations

RUN npx prisma generate --schema ./packages/prisma/schema.prisma

COPY --chown=nodejs:nodejs ./docker/start.sh /app/apps/remix/start.sh

WORKDIR /app/apps/remix
CMD ["sh", "start.sh"]
