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


FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5000

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

COPY --from=builder /app/apps/api/dist ./apps/api/dist

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

CMD ["node", "apps/api/dist/server.js"]
