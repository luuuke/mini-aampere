import { PrismaService } from '../prisma/prisma.service.js';
import { AuctionsService } from './auctions.service.js';

describe('AuctionsService', () => {
  const findMany = vi.fn();
  const service = new AuctionsService({
    auction: { findMany },
  } as unknown as PrismaService);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps dealer-safe rows, converts decimals, and orders live auctions first', async () => {
    findMany.mockResolvedValue([
      auctionRow({
        id: 'scheduled',
        startsAt: '2026-09-01T14:00:00.000Z',
        endsAt: '2026-09-02T14:00:00.000Z',
      }),
      auctionRow({
        id: 'live-later',
        startsAt: '2026-09-01T10:00:00.000Z',
        endsAt: '2026-09-01T16:00:00.000Z',
      }),
      auctionRow({
        id: 'live-soon',
        startsAt: '2026-09-01T11:00:00.000Z',
        endsAt: '2026-09-01T13:00:00.000Z',
      }),
    ]);

    const result = await service.listDealerAuctions();

    expect(result.map(({ id }) => id)).toEqual([
      'live-soon',
      'live-later',
      'scheduled',
    ]);
    expect(result.map(({ status }) => status)).toEqual([
      'LIVE',
      'LIVE',
      'SCHEDULED',
    ]);
    expect(result[0]?.vehicle).toMatchObject({
      batteryCapacityKwh: 75.5,
      batteryHealthPercent: 92.25,
    });

    const query = findMany.mock.calls[0]?.[0];
    expect(query.where).toEqual({
      endsAt: { gt: new Date('2026-09-01T12:00:00.000Z') },
    });
    expect(query.select).not.toHaveProperty('reservePrice');
    expect(query.select).not.toHaveProperty('bids');
    expect(query.select).not.toHaveProperty('winningBid');
  });
});

function auctionRow({
  id,
  startsAt,
  endsAt,
}: {
  id: string;
  startsAt: string;
  endsAt: string;
}) {
  return {
    id,
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
    startingPrice: 20_000,
    minIncrement: 250,
    vehicle: {
      id: `${id}-vehicle`,
      make: 'Tesla',
      model: 'Model 3',
      year: 2022,
      mileageKm: 32_000,
      batteryCapacityKwh: { toNumber: () => 75.5 },
      batteryHealthPercent: { toNumber: () => 92.25 },
      rangeKm: 480,
      photoUrls: ['https://example.com/vehicle.jpg'],
      city: 'Madrid',
      country: 'Spain',
    },
  };
}
