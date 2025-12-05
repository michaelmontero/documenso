###########################
#     BASE CONTAINER      #
###########################
FROM node:22-alpine3.20 AS base

RUN apk add --no-cache openssl font-freefont


###########################
#    BUILDER CONTAINER    #
###########################
FROM base AS builder

RUN apk add --no-cache libc6-compat jq
WORKDIR /app

COPY . .

# ⭐ COPY CERTS BEFORE TURBO PRUNE (otherwise they are deleted)
COPY apps/certs ./apps/certs

RUN npm install -g "turbo@^1.9.3"
RUN turbo prune --scope=@documenso/remix --docker


###########################
#   INSTALLER CONTAINER   #
###########################
FROM base AS installer

RUN apk add --no-cache libc6-compat jq make cmake g++ openssl bash

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

# ⭐ Copy certs from builder
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

RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/lib/chromium/
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
USER nodejs

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/out/json/ .
COPY --from=builder --chown=nodejs:nodejs /app/out/full/packages/tailwind-config ./packages/tailwind-config
COPY --from=builder --chown=nodejs:nodejs /app/patches ./patches

# ⭐ Finally ensure certs appear in final image
COPY --from=builder --chown=nodejs:nodejs /app/apps/certs ./certs

RUN npm ci --only=production

COPY --from=installer --chown=nodejs:nodejs /app/apps/remix/build ./apps/remix/build
COPY --from=installer --chown=nodejs:nodejs /app/apps/remix/public ./apps/remix/public

COPY --from=installer --chown=nodejs:nodejs /app/packages/prisma/schema.prisma ./packages/prisma/schema.prisma
COPY --from=installer --chown=nodejs:nodejs /app/packages/prisma/migrations ./packages/prisma/migrations

RUN npx prisma generate --schema ./packages/prisma/schema.prisma

COPY --chown=nodejs:nodejs ./docker/start.sh /app/apps/remix/start.sh

WORKDIR /app/apps/remix
CMD ["sh", "start.sh"]
