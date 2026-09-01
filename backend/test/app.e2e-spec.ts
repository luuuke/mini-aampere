import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { Roles } from '../src/auth/decorators/roles.decorator.js';
import { UserRole } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AuctionsService } from '../src/auctions/auctions.service.js';

@Controller('test-only')
class ProtectedTestController {
  @Get('authenticated')
  authenticated() {
    return { authenticated: true };
  }

  @Roles(UserRole.ADMIN)
  @Get('admin')
  admin() {
    return { role: UserRole.ADMIN };
  }
}

describe('App (e2e)', () => {
  let app: INestApplication<App>;
  const createAuction = vi.fn();
  const confirmResult = vi.fn();

  beforeAll(async () => {
    process.env['JWT_SECRET'] = 'e2e-test-secret';
    process.env['JWT_EXPIRES_IN_SECONDS'] = '3600';

    const passwordHash = await hash('Aampere123!', 4);
    const users = [
      {
        id: 'admin-id',
        email: 'admin@aampere.test',
        passwordHash,
        name: 'Aampere Admin',
        dealershipName: null,
        role: UserRole.ADMIN,
      },
      {
        id: 'dealer-id',
        email: 'sofia@iberiaev.test',
        passwordHash,
        name: 'Sofia García',
        dealershipName: 'Iberia EV',
        role: UserRole.DEALER,
      },
    ];
    const prisma = {
      user: {
        findUnique: vi.fn(({ where }: { where: { email: string } }) =>
          Promise.resolve(
            users.find((user) => user.email === where.email) ?? null,
          ),
        ),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProtectedTestController],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(AuctionsService)
      .useValue({
        listDealerAuctions: vi.fn(),
        create: createAuction,
        confirmResult,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('keeps the health endpoint public', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('logs in a seeded admin without exposing the password hash', async () => {
    const response = await login('admin@aampere.test');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      accessToken: expect.any(String),
      user: {
        id: 'admin-id',
        email: 'admin@aampere.test',
        name: 'Aampere Admin',
        dealershipName: null,
        role: UserRole.ADMIN,
      },
    });
  });

  it('logs in a seeded dealer', async () => {
    const response = await login(' SOFIA@IBERIAEV.TEST ');

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe(UserRole.DEALER);
  });

  it('returns the same unauthorized response for unknown users and bad passwords', async () => {
    const unknownUser = await login('missing@example.com');
    const badPassword = await login('admin@aampere.test', 'incorrect');

    expect(unknownUser.status).toBe(401);
    expect(badPassword.status).toBe(401);
    expect(unknownUser.body.message).toBe('Invalid email or password');
    expect(badPassword.body.message).toBe('Invalid email or password');
  });

  it('validates the login body', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'not-an-email', password: '', role: UserRole.ADMIN })
      .expect(400);
  });

  it('requires a valid bearer token on protected endpoints', async () => {
    await request(app.getHttpServer())
      .get('/test-only/authenticated')
      .expect(401);

    const { body } = await login('sofia@iberiaev.test');
    await request(app.getHttpServer())
      .get('/test-only/authenticated')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(200, { authenticated: true });
  });

  it('enforces role metadata on the backend', async () => {
    const dealerLogin = await login('sofia@iberiaev.test');
    await request(app.getHttpServer())
      .get('/test-only/admin')
      .set('Authorization', `Bearer ${dealerLogin.body.accessToken}`)
      .expect(403);

    const adminLogin = await login('admin@aampere.test');
    await request(app.getHttpServer())
      .get('/test-only/admin')
      .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
      .expect(200, { role: UserRole.ADMIN });
  });

  describe('admin auction result confirmation', () => {
    const auctionId = '20000000-0000-4000-8000-000000000003';

    beforeEach(() => {
      confirmResult.mockReset();
    });

    it('lets an admin confirm sold without accepting a winning bid id', async () => {
      const confirmedAt = new Date('2030-01-01T12:00:00.000Z');
      confirmResult.mockResolvedValue({
        auctionId,
        result: 'SOLD',
        winningBid: {
          id: '30000000-0000-4000-8000-000000000008',
          dealerId: 'dealer-id',
          amount: 20_000,
          placedAt: confirmedAt,
        },
        resultConfirmedAt: confirmedAt,
      });
      const adminLogin = await login('admin@aampere.test');

      const response = await request(app.getHttpServer())
        .patch(`/admin/auctions/${auctionId}/result`)
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
        .send({ result: 'SOLD' })
        .expect(200);

      expect(confirmResult).toHaveBeenCalledWith({
        auctionId,
        result: 'SOLD',
      });
      expect(response.body).toMatchObject({
        auctionId,
        result: 'SOLD',
        resultConfirmedAt: confirmedAt.toISOString(),
        winningBid: {
          id: '30000000-0000-4000-8000-000000000008',
        },
      });
    });

    it('does not let a dealer confirm a result', async () => {
      const dealerLogin = await login('sofia@iberiaev.test');

      await request(app.getHttpServer())
        .patch(`/admin/auctions/${auctionId}/result`)
        .set('Authorization', `Bearer ${dealerLogin.body.accessToken}`)
        .send({ result: 'UNSOLD' })
        .expect(403);

      expect(confirmResult).not.toHaveBeenCalled();
    });

    it.each([
      { name: 'a missing result', body: {} },
      { name: 'an invalid result', body: { result: 'PENDING' } },
      {
        name: 'a caller-provided winning bid id',
        body: {
          result: 'SOLD',
          winningBidId: '30000000-0000-4000-8000-000000000008',
        },
      },
    ])('rejects $name', async ({ body }) => {
      const adminLogin = await login('admin@aampere.test');

      await request(app.getHttpServer())
        .patch(`/admin/auctions/${auctionId}/result`)
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
        .send(body)
        .expect(400);

      expect(confirmResult).not.toHaveBeenCalled();
    });

    it('rejects an invalid auction id before calling the service', async () => {
      const adminLogin = await login('admin@aampere.test');

      await request(app.getHttpServer())
        .patch('/admin/auctions/not-a-uuid/result')
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
        .send({ result: 'UNSOLD' })
        .expect(400);

      expect(confirmResult).not.toHaveBeenCalled();
    });
  });

  describe('admin auction creation', () => {
    beforeEach(() => {
      createAuction.mockReset();
    });

    it('lets an admin create a vehicle and auction', async () => {
      const input = validCreateAuctionBody();
      createAuction.mockResolvedValue({
        id: 'auction-id',
        status: 'SCHEDULED',
        startsAt: new Date(input.auction.startsAt),
        endsAt: new Date('2030-01-03T09:00:00.000Z'),
        startingPrice: input.auction.startingPrice,
        reservePrice: input.auction.reservePrice,
        minIncrement: input.auction.minIncrement,
        result: null,
        resultConfirmedAt: null,
        winningBid: null,
        vehicle: {
          id: 'vehicle-id',
          ...input.vehicle,
          vin: '5YJ3E7EA1KF000001',
          make: 'Tesla',
          registrationDate: '2022-05-18',
        },
      });
      const adminLogin = await login('admin@aampere.test');

      const response = await request(app.getHttpServer())
        .post('/admin/auctions')
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
        .send(input)
        .expect(201);

      expect(createAuction).toHaveBeenCalledWith({
        vehicle: {
          ...input.vehicle,
          vin: '5YJ3E7EA1KF000001',
          make: 'Tesla',
          registrationDate: '2022-05-18',
        },
        auction: {
          ...input.auction,
          startsAt: '2030-01-02T09:00:00.000Z',
        },
      });
      expect(response.body).toMatchObject({
        id: 'auction-id',
        status: 'SCHEDULED',
        endsAt: '2030-01-03T09:00:00.000Z',
        reservePrice: 28_000,
        vehicle: {
          id: 'vehicle-id',
          vin: '5YJ3E7EA1KF000001',
          registrationDate: '2022-05-18',
        },
      });
    });

    it('does not let a dealer create an auction', async () => {
      const dealerLogin = await login('sofia@iberiaev.test');

      await request(app.getHttpServer())
        .post('/admin/auctions')
        .set('Authorization', `Bearer ${dealerLogin.body.accessToken}`)
        .send(validCreateAuctionBody())
        .expect(403);

      expect(createAuction).not.toHaveBeenCalled();
    });

    it('requires authentication', async () => {
      await request(app.getHttpServer())
        .post('/admin/auctions')
        .send(validCreateAuctionBody())
        .expect(401);

      expect(createAuction).not.toHaveBeenCalled();
    });

    it.each([
      {
        name: 'a missing vehicle',
        body: { auction: validCreateAuctionBody().auction },
      },
      {
        name: 'a missing auction',
        body: { vehicle: validCreateAuctionBody().vehicle },
      },
      {
        name: 'an array-shaped vehicle',
        body: {
          ...validCreateAuctionBody(),
          vehicle: [],
        },
      },
      {
        name: 'an array-shaped auction',
        body: {
          ...validCreateAuctionBody(),
          auction: [],
        },
      },
      {
        name: 'a server-owned auction field',
        body: {
          ...validCreateAuctionBody(),
          auction: {
            ...validCreateAuctionBody().auction,
            result: 'SOLD',
          },
        },
      },
      {
        name: 'a timezone-less start',
        body: {
          ...validCreateAuctionBody(),
          auction: {
            ...validCreateAuctionBody().auction,
            startsAt: '2030-01-02T09:00:00',
          },
        },
      },
      {
        name: 'a null end instead of an omitted end',
        body: {
          ...validCreateAuctionBody(),
          auction: {
            ...validCreateAuctionBody().auction,
            endsAt: null,
          },
        },
      },
      {
        name: 'a registration timestamp instead of a date',
        body: {
          ...validCreateAuctionBody(),
          vehicle: {
            ...validCreateAuctionBody().vehicle,
            registrationDate: '2022-05-18T00:00:00Z',
          },
        },
      },
      {
        name: 'a non-HTTP photo URL',
        body: {
          ...validCreateAuctionBody(),
          vehicle: {
            ...validCreateAuctionBody().vehicle,
            photoUrls: ['ftp://example.com/vehicle.jpg'],
          },
        },
      },
    ])('rejects $name', async ({ body }) => {
      const adminLogin = await login('admin@aampere.test');

      await request(app.getHttpServer())
        .post('/admin/auctions')
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
        .send(body)
        .expect(400);

      expect(createAuction).not.toHaveBeenCalled();
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  function login(email: string, password = 'Aampere123!') {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password });
  }

  function validCreateAuctionBody() {
    return {
      vehicle: {
        vin: ' 5yj3e7ea1kf000001 ',
        make: ' Tesla ',
        model: 'Model 3 Long Range',
        year: 2022,
        mileageKm: 48_500,
        batteryCapacityKwh: 75,
        batteryHealthPercent: 93.5,
        rangeKm: 560,
        registrationDate: ' 2022-05-18 ',
        conditionNotes: 'Minor stone chips on the front bumper.',
        photoUrls: ['https://example.com/vehicle.jpg'],
        city: 'Madrid',
        country: 'Spain',
      },
      auction: {
        startsAt: ' 2030-01-02T09:00:00.000Z ',
        startingPrice: 24_000,
        reservePrice: 28_000,
        minIncrement: 250,
      },
    };
  }
});
