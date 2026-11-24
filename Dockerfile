FROM node:24-alpine AS dependencies

WORKDIR /app

# Only the API workspace is installed. npm resolves the other workspaces from the
# lockfile without needing their manifests present.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json

RUN npm ci --workspace @devforge/api


FROM dependencies AS builder

COPY apps/api ./apps/api

# The Prisma client is generated, not committed, and the build both imports it
# and copies it into dist. Generating needs no database connection.
RUN npm run db:generate --workspace @devforge/api
RUN npm run build --workspace @devforge/api


FROM node:24-alpine AS web-builder

WORKDIR /app

# The web app is built here and only its static output reaches the runner, so
# none of its dependencies (React, Vite, Tailwind) are in the final image. This
# stage does not depend on the API stages, so the two build in parallel.
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json

RUN npm ci --workspace @devforge/web

COPY apps/web ./apps/web

RUN npm run build --workspace @devforge/web


FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5000
ENV WEB_DIST_DIR=/app/apps/web/dist

# A fresh production-only install, not a copy of the builder's node_modules.
# npm decides whether each package lives in the root node_modules or in
# apps/api/node_modules, and here it put the whole Prisma tree under the
# latter, so copying only the root left the image without @prisma/adapter-pg.
# Installing again with the same lockfile reproduces that layout whatever it is.
# Lifecycle scripts are skipped: nothing in the production tree needs one, and a
# production install should not run arbitrary install scripts.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
RUN npm ci --omit=dev --ignore-scripts --workspace @devforge/api \
  && npm cache clean --force

# Prisma's schema engine, which applies migrations, is a native binary that its
# postinstall step would normally download. That step is skipped above, so
# without this the first `migrate deploy` would try to download it at start-up
# into a directory the app user cannot write to. Asking the CLI for its version
# fetches it now, at build time. The schema engine also needs OpenSSL on Alpine.
RUN apk add --no-cache openssl \
  && npm exec --workspace @devforge/api -- prisma --version

COPY --from=builder /app/apps/api/dist ./apps/api/dist

# The built web app. The API serves it when WEB_DIST_DIR is set, so the browser
# sees one origin: no CORS, and the app's relative /api calls just work.
COPY --from=web-builder /app/apps/web/dist ./apps/web/dist

# Migration inputs and the entrypoint. start.mjs applies the migrations first
# when RUN_MIGRATIONS_ON_START=true, then starts the server.
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY apps/api/scripts/start.mjs ./apps/api/scripts/start.mjs

# The app only reads its own files, so they stay owned by root and the process
# runs as a user that cannot modify them.
RUN addgroup --system --gid 1001 devforge \
  && adduser --system --uid 1001 --ingroup devforge devforge

USER devforge

EXPOSE 5000

# Liveness only. /health never touches the database, so a database outage does
# not get the container killed and restarted. /ready is the readiness probe.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/health" || exit 1

CMD ["node", "apps/api/scripts/start.mjs"]
