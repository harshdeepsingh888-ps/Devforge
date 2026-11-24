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
RUN npm prune --omit=dev


FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5000

RUN addgroup --system --gid 1001 devforge \
  && adduser --system --uid 1001 --ingroup devforge devforge

COPY --from=builder --chown=devforge:devforge /app/package.json ./package.json
COPY --from=builder --chown=devforge:devforge /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=devforge:devforge /app/node_modules ./node_modules
COPY --from=builder --chown=devforge:devforge /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=devforge:devforge /app/apps/api/dist ./apps/api/dist

USER devforge

EXPOSE 5000

# Liveness only. /health never touches the database, so a database outage does
# not get the container killed and restarted. /ready is the readiness probe.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/health" || exit 1

CMD ["node", "apps/api/dist/server.js"]
