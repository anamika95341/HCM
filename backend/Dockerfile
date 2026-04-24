FROM node:22-bookworm-slim AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY . .
# Keep the entrypoint outside /app so bind mounts cannot hide it in dev containers.
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
  && chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 3000
# Run via sh so CRLF/shebang quirks on the script cannot break container start.
ENTRYPOINT ["/bin/sh", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm","run","dev"]

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

FROM node:22-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends tini wget ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser \
  && mkdir -p /app/uploads && chown appuser:appgroup /app/uploads
COPY --from=builder /app/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app ./
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
  && chmod +x /usr/local/bin/docker-entrypoint.sh
USER appuser
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--", "/bin/sh", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node","server.js"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://localhost:3000/health || exit 1
