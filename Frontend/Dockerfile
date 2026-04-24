FROM node:22-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN set -eux; \
  for attempt in 1 2 3; do \
    npm ci && exit 0; \
    echo "npm ci failed on attempt ${attempt}; cleaning npm cache before retry"; \
    npm cache clean --force; \
    sleep $((attempt * 5)); \
  done; \
  exit 1
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN set -eux; \
  for attempt in 1 2 3; do \
    npm ci && exit 0; \
    echo "npm ci failed on attempt ${attempt}; cleaning npm cache before retry"; \
    npm cache clean --force; \
    sleep $((attempt * 5)); \
  done; \
  exit 1
COPY . .
ARG VITE_API_BASE_URL=http://localhost:3000/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM node:22-alpine AS prod
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server.cjs ./server.cjs
USER node
EXPOSE 5173
CMD ["node", "server.cjs"]
