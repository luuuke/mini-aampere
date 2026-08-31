# Aampere dealer auction

This repository is the starting point for the Aampere full-stack challenge.

## Prerequisites

- Node.js 24.15+
- npm 11+
- Docker with Docker Compose

## Run the backend

Start PostgreSQL from the repository root:

```bash
docker-compose up -d postgres
```

Install and start the API:

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run start:dev
```

## Checks

Run these commands from `backend/`:

```bash
npm run format
npm run lint
npm run build
npm test
npm run test:e2e
```
