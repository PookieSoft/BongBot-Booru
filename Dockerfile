FROM node:24-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y git --no-install-recommends && rm -rf /var/lib/apt/lists/*
RUN git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"

COPY ./src /app/src
COPY ./package.json /app/package.json
COPY ./package-lock.json /app/package-lock.json
COPY ./tsconfig.json /app/tsconfig.json
COPY ./esbuild.config.mjs /app/esbuild.config.mjs
COPY ./postinstall.js /app/postinstall.js

RUN --mount=type=cache,target=/root/.npm npm install
# ensure dist is clean before building - postinstall will build with tsc, but standalone is built with esbuild, so we need to ensure dist is clean before building standalone
RUN rm -rf /app/dist
RUN npm run build
RUN mkdir -p /app/logs
RUN mkdir -p /app/data

FROM gcr.io/distroless/nodejs24-debian12 AS release

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/logs /app/logs
COPY --from=builder /app/data /app/data
COPY --from=builder /app/package.json /app/package.json

ENV NODE_ENV=production

CMD ["--no-deprecation", "--enable-source-maps", "/app/dist/standalone.js"]
