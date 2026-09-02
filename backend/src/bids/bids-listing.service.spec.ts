import { PrismaService } from '../prisma/prisma.service.js';
import { BidsService } from './bids.service.js';

describe('BidsService dealer listing', () => {
  const findMany = vi.fn();
  const service = new BidsService({
    auction: { findMany },
  } as unknown as PrismaService);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the dealer latest bid using a dealer-safe query', async () => {
    findMany.mockResolvedValue([auctionRow()]);

    await expect(service.listDealerBids('dealer-id')).resolves.toEqual([
      {
        auctionId: 'auction-id',
        vehicle: {
          make: 'Tesla',
          model: 'Model 3',
          year: 2022,
        },
        bid: {
          status: 'ACTIVE',
          amount: 21_000,
          placedAt: new Date('2030-01-01T11:30:00.000Z'),
          nextMinimumAmount: 21_250,
        },
        auctionStatus: 'LIVE',
        endsAt: new Date('2030-01-01T14:00:00.000Z'),
      },
    ]);

    const query = findMany.mock.calls[0]?.[0];
    expect(query).toEqual({
      where: {
        bids: {
          some: { dealerId: 'dealer-id' },
        },
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        minIncrement: true,
        result: true,
        winningBidId: true,
        vehicle: {
          select: {
            make: true,
            model: true,
            year: true,
          },
        },
        bids: {
          where: { dealerId: 'dealer-id' },
          orderBy: [{ placedAt: 'desc' }, { id: 'desc' }],
          take: 1,
          select: {
            id: true,
            amount: true,
            placedAt: true,
          },
        },
      },
    });
    expect(query.select).not.toHaveProperty('reservePrice');
    expect(query.select.bids.select).not.toHaveProperty('dealerId');
    expect(query.select.bids).not.toHaveProperty('include');
  });

  it('orders active auctions by urgency before pending and confirmed results', async () => {
    findMany.mockResolvedValue([
      auctionRow({
        id: 'confirmed',
        startsAt: '2029-12-28T10:00:00.000Z',
        endsAt: '2029-12-29T10:00:00.000Z',
        result: 'UNSOLD',
      }),
      auctionRow({
        id: 'active-later',
        endsAt: '2030-01-01T16:00:00.000Z',
      }),
      auctionRow({
        id: 'awaiting-review',
        startsAt: '2029-12-31T09:00:00.000Z',
        endsAt: '2030-01-01T09:00:00.000Z',
      }),
      auctionRow({
        id: 'active-soon',
        endsAt: '2030-01-01T13:00:00.000Z',
      }),
    ]);

    const result = await service.listDealerBids('dealer-id');

    expect(result.map(({ auctionId }) => auctionId)).toEqual([
      'active-soon',
      'active-later',
      'awaiting-review',
      'confirmed',
    ]);
    expect(result[2]?.bid.nextMinimumAmount).toBeNull();
    expect(result[3]?.bid.nextMinimumAmount).toBeNull();
  });

  it('returns an empty list when the dealer has not bid', async () => {
    findMany.mockResolvedValue([]);

    await expect(service.listDealerBids('dealer-id')).resolves.toEqual([]);
  });
});

function auctionRow(
  overrides: Partial<{
    id: string;
    startsAt: string;
    endsAt: string;
    result: 'SOLD' | 'UNSOLD' | null;
    winningBidId: string | null;
  }> = {},
) {
  return {
    id: overrides.id ?? 'auction-id',
    startsAt: new Date(overrides.startsAt ?? '2030-01-01T10:00:00.000Z'),
    endsAt: new Date(overrides.endsAt ?? '2030-01-01T14:00:00.000Z'),
    minIncrement: 250,
    result: overrides.result ?? null,
    winningBidId: overrides.winningBidId ?? null,
    vehicle: {
      make: 'Tesla',
      model: 'Model 3',
      year: 2022,
    },
    bids: [
      {
        id: 'dealer-bid-id',
        amount: 21_000,
        placedAt: new Date('2030-01-01T11:30:00.000Z'),
      },
    ],
  };
}
