FROM node:24.15-bookworm-slim AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN NODE_OPTIONS=--max-old-space-size=256 npm ci --ignore-scripts --no-audit --no-fund

FROM dependencies AS build

ARG API_URL=http://backend:3000
ENV API_URL=$API_URL \
    NEXT_TELEMETRY_DISABLED=1

COPY . .
RUN npm run build -- --webpack

FROM node:24.15-bookworm-slim AS production

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3001
WORKDIR /app

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3001

CMD ["node", "server.js"]
