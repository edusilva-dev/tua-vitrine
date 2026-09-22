FROM oven/bun:1.3.14 AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM dependencies AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV APP_ENV=development
ENV LOCAL_ONLY=true
ENV APP_URL=http://localhost:3000
ENV STORAGE_DIR=/tmp/storage
RUN bun run db:generate
RUN bun run build

FROM oven/bun:1.3.14 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=builder --chown=bun:bun /app/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static
RUN mkdir -p /data/storage && chown -R bun:bun /data
USER bun
EXPOSE 3000
CMD ["bun", "server.js"]
