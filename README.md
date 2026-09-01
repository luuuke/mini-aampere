# Aampere dealer auction

This repository is the starting point for the Aampere full-stack challenge.

## Prerequisites

- Node.js 24.15+
- npm 11+
- Docker with Docker Compose

## Run the backend

Start PostgreSQL and the Adminer database UI from the repository root:

```bash
docker-compose up -d postgres adminer
```

Install and start the API:

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

## Run the frontend

In another terminal, install and start the Next.js application:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). The frontend uses port 3001 so the API
can continue to use port 3000.

## Seeded users

The development seed creates these users. They all use the password `Aampere123!`.

| Role   | Email                 | Name          | Dealership      |
| ------ | --------------------- | ------------- | --------------- |
| Admin  | `admin@aampere.test`  | Aampere Admin | —               |
| Dealer | `sofia@iberiaev.test` | Sofia García  | Iberia EV       |
| Dealer | `marco@eurovolt.test` | Marco Rossi   | EuroVolt Motors |
| Dealer | `lea@rhein-auto.test` | Léa Martin    | Rhein Auto      |

## Authentication

Log in with a seeded user's email and password:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@aampere.test","password":"Aampere123!"}'
```

The response contains an `accessToken` and the safe user profile. Send the token to
protected endpoints as `Authorization: Bearer <accessToken>`. Routes are protected by
default; backend controllers can use `@Public()` for exceptions and `@Roles(...)` for
role-based access.

## Checks

Run these commands from `backend/`:

```bash
npm run format
npm run lint
npm run build
npm test
npm run test:e2e
```

## Database UI

Open [Adminer](http://localhost:8080) and sign in with:

- System: `PostgreSQL`
- Server: `postgres`
- Username: `aampere`
- Password: `aampere`
- Database: `aampere`
