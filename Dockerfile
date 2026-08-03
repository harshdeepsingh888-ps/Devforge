FROM node:24-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json

RUN npm ci --workspace @devforge/api


FROM dependencies AS builder

COPY apps/api ./apps/api

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

CMD ["node", "apps/api/dist/server.js"]