FROM oven/bun:1.3.14 AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM dependencies AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN export DATABASE_URL=postgresql://build:build@localhost:5432/build \
    APP_ENV=development \
    LOCAL_ONLY=true \
    AUTH_MODE=local \
    APP_URL=http://localhost:3000 \
    STORAGE_DIR=/tmp/storage && \
    bun run db:generate && \
    bun run build

FROM oven/bun:1.3.14 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=builder --chown=bun:bun /app/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static
RUN mkdir -p /data/storage /data/mail-outbox && chown -R bun:bun /data
USER bun
EXPOSE 3000
CMD ["bun", "server.js"]
