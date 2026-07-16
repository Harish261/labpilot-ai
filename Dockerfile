# ---- Stage 1: install deps + build the frontend ----
FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN bun install

COPY . .
RUN bun run build

# ---- Stage 2: lightweight runtime ----
FROM oven/bun:1-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Reuse the lockfile bun generated in the builder stage so this
# install resolves to the exact same versions, minus devDependencies
# (vite, typescript, tailwind, oxlint) that aren't needed at runtime.
COPY --from=builder /app/package.json /app/bun.lock ./
RUN bun install --production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

# Cloud Run always sets PORT itself; this is just a sane local default.
ENV PORT=8080
EXPOSE 8080

CMD ["bun", "run", "server/index.ts"]
