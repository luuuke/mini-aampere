import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import {
  AuctionResult,
  PrismaClient,
  UserRole,
} from '../src/generated/prisma/client.js';

const databaseUrl = process.env['DATABASE_URL'];

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const developmentPassword = 'Aampere123!';

const hourInMilliseconds = 60 * 60 * 1_000;

const hoursFrom = (date: Date, hours: number): Date =>
  new Date(date.getTime() + hours * hourInMilliseconds);

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

  const seededUsers = [];

  for (const user of users) {
    const seededUser = await prisma.user.upsert({
      where: { email: user.email },
      update: { ...user, passwordHash },
      create: { ...user, passwordHash },
    });

    seededUsers.push(seededUser);
  }

  const dealerIdByEmail = new Map(
    seededUsers.map((user) => [user.email, user.id]),
  );
  const dealerId = (email: string): string => {
    const id = dealerIdByEmail.get(email);

    if (!id) {
      throw new Error(`Seeded dealer not found: ${email}`);
    }

    return id;
  };

  const vehicles = [
    {
      id: '10000000-0000-4000-8000-000000000001',
      vin: '5YJ3E7EA1KF000001',
      make: 'Tesla',
      model: 'Model 3 Long Range',
      year: 2022,
      mileageKm: 48_500,
      batteryCapacityKwh: 75,
      batteryHealthPercent: 93.5,
      rangeKm: 560,
      registrationDate: new Date('2022-05-18T00:00:00.000Z'),
      conditionNotes:
        'Very good condition. Minor stone chips on the front bumper.',
      photoUrls: [
        'https://images.unsplash.com/photo-1560958089-b8a1929cea89',
        'https://images.unsplash.com/photo-1571987502227-9231b837d92a',
      ],
      city: 'Madrid',
      country: 'Spain',
    },
    {
      id: '10000000-0000-4000-8000-000000000002',
      vin: 'WVWZZZE1ZMP000002',
      make: 'Volkswagen',
      model: 'ID.4 Pro Performance',
      year: 2021,
      mileageKm: 62_300,
      batteryCapacityKwh: 77,
      batteryHealthPercent: 90.2,
      rangeKm: 510,
      registrationDate: new Date('2021-09-03T00:00:00.000Z'),
      conditionNotes:
        'Full service history. Light curb rash on the rear-right wheel.',
      photoUrls: [
        'https://images.unsplash.com/photo-1619767886558-efdc259cde1a',
        'https://images.unsplash.com/photo-1617469767053-d3b523a0b982',
      ],
      city: 'Barcelona',
      country: 'Spain',
    },
    {
      id: '10000000-0000-4000-8000-000000000003',
      vin: 'WBY1Z42070V000003',
      make: 'BMW',
      model: 'i3 120 Ah',
      year: 2020,
      mileageKm: 71_800,
      batteryCapacityKwh: 42.2,
      batteryHealthPercent: 88.7,
      rangeKm: 285,
      registrationDate: new Date('2020-11-12T00:00:00.000Z'),
      conditionNotes:
        'Clean interior and bodywork. Charging cable and two keys included.',
      photoUrls: [
        'https://images.unsplash.com/photo-1555215695-3004980ad54e',
        'https://images.unsplash.com/photo-1523983388277-336a66bf9bcd',
      ],
      city: 'Lyon',
      country: 'France',
    },
    {
      id: '10000000-0000-4000-8000-000000000004',
      vin: 'TMAK281GFLJ000004',
      make: 'Hyundai',
      model: 'Kona Electric 64 kWh',
      year: 2020,
      mileageKm: 54_900,
      batteryCapacityKwh: 64,
      batteryHealthPercent: 91.4,
      rangeKm: 449,
      registrationDate: new Date('2020-07-21T00:00:00.000Z'),
      conditionNotes:
        'Good overall condition with a small scratch on the left rear door.',
      photoUrls: [
        'https://images.unsplash.com/photo-1615906655593-ad0386982a0f',
        'https://images.unsplash.com/photo-1609521263047-f8f205293f24',
      ],
      city: 'Milan',
      country: 'Italy',
    },
    {
      id: '10000000-0000-4000-8000-000000000005',
      vin: 'SJNFAAZE1U0000005',
      make: 'Nissan',
      model: 'Leaf e+ Tekna',
      year: 2019,
      mileageKm: 83_200,
      batteryCapacityKwh: 62,
      batteryHealthPercent: 84.9,
      rangeKm: 385,
      registrationDate: new Date('2019-10-08T00:00:00.000Z'),
      conditionNotes:
        'Mechanically sound. Visible wear on the driver seat and boot trim.',
      photoUrls: [
        'https://images.unsplash.com/photo-1593055357429-62eaf3b259cc',
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf',
      ],
      city: 'Cologne',
      country: 'Germany',
    },
  ];

  for (const vehicle of vehicles) {
    const { id, vin, ...data } = vehicle;

    await prisma.vehicle.upsert({
      where: { vin },
      update: data,
      create: { id, vin, ...data },
    });
  }

  const seededAt = new Date();
  const auctions = [
    {
      id: '20000000-0000-4000-8000-000000000001',
      vehicleId: vehicles[0].id,
      startsAt: hoursFrom(seededAt, 2),
      endsAt: hoursFrom(seededAt, 26),
      startingPrice: 24_000,
      reservePrice: 28_000,
      minIncrement: 250,
    },
    {
      id: '20000000-0000-4000-8000-000000000002',
      vehicleId: vehicles[1].id,
      startsAt: hoursFrom(seededAt, -6),
      endsAt: hoursFrom(seededAt, 18),
      startingPrice: 20_000,
      reservePrice: 23_000,
      minIncrement: 250,
    },
    {
      id: '20000000-0000-4000-8000-000000000003',
      vehicleId: vehicles[2].id,
      startsAt: hoursFrom(seededAt, -30),
      endsAt: hoursFrom(seededAt, -6),
      startingPrice: 11_000,
      reservePrice: 12_500,
      minIncrement: 200,
    },
    {
      id: '20000000-0000-4000-8000-000000000004',
      vehicleId: vehicles[3].id,
      startsAt: hoursFrom(seededAt, -72),
      endsAt: hoursFrom(seededAt, -48),
      startingPrice: 17_000,
      reservePrice: 18_500,
      minIncrement: 250,
    },
    {
      id: '20000000-0000-4000-8000-000000000005',
      vehicleId: vehicles[4].id,
      startsAt: hoursFrom(seededAt, -96),
      endsAt: hoursFrom(seededAt, -72),
      startingPrice: 12_500,
      reservePrice: 15_000,
      minIncrement: 250,
    },
  ];

  for (const auction of auctions) {
    await prisma.auction.upsert({
      where: { id: auction.id },
      update: {
        ...auction,
        result: null,
        winningBidId: null,
        resultConfirmedAt: null,
      },
      create: auction,
    });
  }

  const bids = [
    {
      id: '30000000-0000-4000-8000-000000000001',
      auctionId: auctions[1].id,
      dealerId: dealerId('sofia@iberiaev.test'),
      amount: 20_500,
      placedAt: hoursFrom(seededAt, -5),
    },
    {
      id: '30000000-0000-4000-8000-000000000002',
      auctionId: auctions[1].id,
      dealerId: dealerId('marco@eurovolt.test'),
      amount: 21_000,
      placedAt: hoursFrom(seededAt, -4),
    },
    {
      id: '30000000-0000-4000-8000-000000000003',
      auctionId: auctions[1].id,
      dealerId: dealerId('lea@rhein-auto.test'),
      amount: 20_750,
      placedAt: hoursFrom(seededAt, -3),
    },
    {
      id: '30000000-0000-4000-8000-000000000004',
      auctionId: auctions[1].id,
      dealerId: dealerId('sofia@iberiaev.test'),
      amount: 21_500,
      placedAt: hoursFrom(seededAt, -2),
    },
    {
      id: '30000000-0000-4000-8000-000000000005',
      auctionId: auctions[2].id,
      dealerId: dealerId('sofia@iberiaev.test'),
      amount: 11_600,
      placedAt: hoursFrom(seededAt, -28),
    },
    {
      id: '30000000-0000-4000-8000-000000000006',
      auctionId: auctions[2].id,
      dealerId: dealerId('marco@eurovolt.test'),
      amount: 12_000,
      placedAt: hoursFrom(seededAt, -25),
    },
    {
      id: '30000000-0000-4000-8000-000000000007',
      auctionId: auctions[2].id,
      dealerId: dealerId('lea@rhein-auto.test'),
      amount: 12_500,
      placedAt: hoursFrom(seededAt, -20),
    },
    {
      id: '30000000-0000-4000-8000-000000000008',
      auctionId: auctions[2].id,
      dealerId: dealerId('marco@eurovolt.test'),
      amount: 12_600,
      placedAt: hoursFrom(seededAt, -10),
    },
    {
      id: '30000000-0000-4000-8000-000000000009',
      auctionId: auctions[3].id,
      dealerId: dealerId('sofia@iberiaev.test'),
      amount: 18_000,
      placedAt: hoursFrom(seededAt, -70),
    },
    {
      id: '30000000-0000-4000-8000-000000000010',
      auctionId: auctions[3].id,
      dealerId: dealerId('marco@eurovolt.test'),
      amount: 18_500,
      placedAt: hoursFrom(seededAt, -66),
    },
    {
      id: '30000000-0000-4000-8000-000000000011',
      auctionId: auctions[3].id,
      dealerId: dealerId('lea@rhein-auto.test'),
      amount: 19_500,
      placedAt: hoursFrom(seededAt, -60),
    },
    {
      id: '30000000-0000-4000-8000-000000000012',
      auctionId: auctions[3].id,
      dealerId: dealerId('sofia@iberiaev.test'),
      amount: 19_000,
      placedAt: hoursFrom(seededAt, -56),
    },
    {
      id: '30000000-0000-4000-8000-000000000013',
      auctionId: auctions[3].id,
      dealerId: dealerId('marco@eurovolt.test'),
      amount: 19_750,
      placedAt: hoursFrom(seededAt, -52),
    },
    {
      id: '30000000-0000-4000-8000-000000000014',
      auctionId: auctions[4].id,
      dealerId: dealerId('sofia@iberiaev.test'),
      amount: 13_000,
      placedAt: hoursFrom(seededAt, -92),
    },
    {
      id: '30000000-0000-4000-8000-000000000015',
      auctionId: auctions[4].id,
      dealerId: dealerId('lea@rhein-auto.test'),
      amount: 14_000,
      placedAt: hoursFrom(seededAt, -86),
    },
    {
      id: '30000000-0000-4000-8000-000000000016',
      auctionId: auctions[4].id,
      dealerId: dealerId('sofia@iberiaev.test'),
      amount: 14_200,
      placedAt: hoursFrom(seededAt, -78),
    },
  ];

  for (const bid of bids) {
    await prisma.bid.upsert({
      where: { id: bid.id },
      update: bid,
      create: bid,
    });
  }

  await prisma.auction.update({
    where: { id: auctions[3].id },
    data: {
      result: AuctionResult.SOLD,
      winningBidId: bids[12].id,
      resultConfirmedAt: hoursFrom(seededAt, -47),
    },
  });

  await prisma.auction.update({
    where: { id: auctions[4].id },
    data: {
      result: AuctionResult.UNSOLD,
      resultConfirmedAt: hoursFrom(seededAt, -70),
    },
  });

  console.log(
    `Seeded ${users.length} users, ${vehicles.length} vehicles, ${auctions.length} auctions, and ${bids.length} bids.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
