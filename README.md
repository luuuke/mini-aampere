# Aampere dealer auction

This repository is the starting point for the Aampere full-stack challenge.

## Prerequisites

- Node.js 24.15+
- npm 11+
- Docker with Docker Compose

## Run the complete stack with Docker

Build and start PostgreSQL, the database initializer, the NestJS API, the Next.js frontend,
and Adminer from the repository root:

```bash
docker compose up --build
```

The database initializer waits for PostgreSQL, applies the committed Prisma migrations, and
loads the development seed before the API starts. The seed is safe to rerun and refreshes the
relative auction timestamps each time the stack starts.

Open:

- Frontend: [http://localhost:3001](http://localhost:3001)
- API: [http://localhost:3000](http://localhost:3000)
- Adminer: [http://localhost:8080](http://localhost:8080)

Press `Ctrl+C` to stop an attached stack. To run it in the background instead, add `-d` and
later stop it with `docker compose down`. The PostgreSQL data remains in the
`postgres_data` volume between runs. Use `docker compose down --volumes` when you explicitly
want to remove that data and recreate the database from scratch.

## Run the development servers separately

This variant keeps PostgreSQL and Adminer in Docker while running the backend and frontend on
the host with their watch-mode development servers.

Start the supporting services from the repository root:

```bash
docker compose up -d postgres adminer
```

Install, configure, and start the API from one terminal:

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

Install, configure, and start the frontend from another terminal:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). The frontend uses port 3001 so the API
can continue to use port 3000.

Do not start a containerized backend or frontend at the same time as its local equivalent,
because they use the same host ports.

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
