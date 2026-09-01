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

  afterAll(async () => {
    await app?.close();
  });

  function login(email: string, password = 'Aampere123!') {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password });
  }
});
