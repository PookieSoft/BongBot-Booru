FROM node:24-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ --no-install-recommends && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=secret,id=NODE_AUTH_TOKEN,env=NODE_AUTH_TOKEN npm ci
COPY tsconfig.json esbuild.config.mjs ./
COPY src ./src
RUN npm run build && npm prune --omit=dev && mkdir -p logs

FROM node:24-slim AS release
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/logs ./logs
COPY --from=builder /app/package.json ./
USER node
CMD ["node", "--enable-source-maps", "dist/standalone.js"]
