FROM node:24.15-bookworm-slim AS base

WORKDIR /app

RUN apt-get update \
    && apt-get install --yes --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN NODE_OPTIONS=--max-old-space-size=256 npm ci --ignore-scripts --no-audit --no-fund

COPY nest-cli.json prisma7.config.ts tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY src ./src

RUN npm run prisma:generate

FROM base AS database-init

CMD ["sh", "-c", "npm exec -- prisma migrate deploy && npm run prisma:seed"]

FROM base AS build

RUN npm run build

FROM node:24.15-bookworm-slim AS production

ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
    && apt-get install --yes --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN NODE_OPTIONS=--max-old-space-size=256 npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
    && npm cache clean --force

COPY --from=build /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
