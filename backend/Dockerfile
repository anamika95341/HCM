FROM node:22-bookworm-slim AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Strip CRLF from Windows checkouts — wrong shebang causes: exec ... no such file or directory
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh \
  && chmod +x /app/docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
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
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app ./
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh \
  && chmod +x /app/docker-entrypoint.sh
USER appuser
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini","--","/app/docker-entrypoint.sh"]
CMD ["node","server.js"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://localhost:3000/health || exit 1
