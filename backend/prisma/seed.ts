import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { PrismaClient, UserRole } from '../src/generated/prisma/client.js';

const databaseUrl = process.env['DATABASE_URL'];

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const developmentPassword = 'Aampere123!';

const users = [
  {
    email: 'admin@aampere.test',
    name: 'Aampere Admin',
    dealershipName: null,
    role: UserRole.ADMIN,
  },
  {
    email: 'sofia@iberiaev.test',
    name: 'Sofia García',
    dealershipName: 'Iberia EV',
    role: UserRole.DEALER,
  },
  {
    email: 'marco@eurovolt.test',
    name: 'Marco Rossi',
    dealershipName: 'EuroVolt Motors',
    role: UserRole.DEALER,
  },
  {
    email: 'lea@rhein-auto.test',
    name: 'Léa Martin',
    dealershipName: 'Rhein Auto',
    role: UserRole.DEALER,
  },
];

async function main(): Promise<void> {
  const passwordHash = await hash(developmentPassword, 12);

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { ...user, passwordHash },
      create: { ...user, passwordHash },
    });
  }

  console.log(`Seeded ${users.length} users.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
