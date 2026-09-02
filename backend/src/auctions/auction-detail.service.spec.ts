import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuctionsService } from './auctions.service.js';

describe('AuctionsService dealer detail', () => {
  const findFirst = vi.fn();
  const service = new AuctionsService({
    auction: { findFirst },
  } as unknown as PrismaService);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a live dealer-safe detail with the dealer latest bid', async () => {
    findFirst.mockResolvedValue(auctionRow());

    await expect(
      service.getDealerAuctionDetail('auction-id', 'dealer-id'),
    ).resolves.toEqual({
      id: 'auction-id',
      status: 'LIVE',
      startsAt: new Date('2030-01-01T10:00:00.000Z'),
      endsAt: new Date('2030-01-01T14:00:00.000Z'),
      startingPrice: 20_000,
      minIncrement: 250,
      nextMinimumBidAmount: 21_250,
      myBid: {
        amount: 21_000,
        placedAt: new Date('2030-01-01T11:30:00.000Z'),
        status: 'ACTIVE',
      },
      vehicle: {
        id: 'vehicle-id',
        vin: '5YJ3E7EA1KF000001',
        make: 'Tesla',
        model: 'Model 3',
        year: 2022,
        mileageKm: 32_000,
        batteryCapacityKwh: 75.5,
        batteryHealthPercent: 92.25,
        rangeKm: 480,
        registrationDate: '2022-03-15',
        conditionNotes: 'Minor cosmetic wear.',
        photoUrls: ['https://example.com/vehicle.jpg'],
        city: 'Madrid',
        country: 'Spain',
      },
    });

    const query = findFirst.mock.calls[0]?.[0];
    expect(query.where).toEqual({
      id: 'auction-id',
      OR: [
        { endsAt: { gt: new Date('2030-01-01T12:00:00.000Z') } },
        { bids: { some: { dealerId: 'dealer-id' } } },
      ],
    });
    expect(query.select).not.toHaveProperty('reservePrice');
    expect(query.select).not.toHaveProperty('winningBid');
    expect(query.select.bids).toEqual({
      where: { dealerId: 'dealer-id' },
      orderBy: [{ placedAt: 'desc' }, { id: 'desc' }],
      take: 1,
      select: {
        id: true,
        amount: true,
        placedAt: true,
      },
    });
    expect(query.select.bids.select).not.toHaveProperty('dealerId');
  });

  it('uses the starting price when a live auction has no dealer bid', async () => {
    findFirst.mockResolvedValue(auctionRow({ bids: [] }));

    const result = await service.getDealerAuctionDetail(
      'auction-id',
      'dealer-id',
    );

    expect(result.nextMinimumBidAmount).toBe(20_000);
    expect(result.myBid).toBeNull();
  });

  it.each([
    {
      name: 'scheduled',
      startsAt: '2030-01-01T13:00:00.000Z',
      endsAt: '2030-01-01T14:00:00.000Z',
      expectedStatus: 'SCHEDULED',
      expectedNextMinimumBidAmount: null,
    },
    {
      name: 'starting exactly now',
      startsAt: '2030-01-01T12:00:00.000Z',
      endsAt: '2030-01-01T14:00:00.000Z',
      expectedStatus: 'LIVE',
      expectedNextMinimumBidAmount: 21_250,
    },
    {
      name: 'ended exactly now',
      startsAt: '2030-01-01T10:00:00.000Z',
      endsAt: '2030-01-01T12:00:00.000Z',
      expectedStatus: 'ENDED',
      expectedNextMinimumBidAmount: null,
    },
  ])(
    'derives status and bidding availability when the auction is $name',
    async ({
      startsAt,
      endsAt,
      expectedStatus,
      expectedNextMinimumBidAmount,
    }) => {
      findFirst.mockResolvedValue(auctionRow({ startsAt, endsAt }));

      const result = await service.getDealerAuctionDetail(
        'auction-id',
        'dealer-id',
      );

      expect(result.status).toBe(expectedStatus);
      expect(result.nextMinimumBidAmount).toBe(expectedNextMinimumBidAmount);
    },
  );

  it.each([
    {
      name: 'awaiting review',
      result: null,
      winningBidId: null,
      expectedStatus: 'AWAITING_REVIEW',
    },
    {
      name: 'won',
      result: 'SOLD',
      winningBidId: 'dealer-bid-id',
      expectedStatus: 'WON',
    },
    {
      name: 'lost',
      result: 'SOLD',
      winningBidId: 'another-bid-id',
      expectedStatus: 'LOST',
    },
    {
      name: 'unsold',
      result: 'UNSOLD',
      winningBidId: null,
      expectedStatus: 'UNSOLD',
    },
  ] as const)(
    'returns the dealer own $name status after the auction ends',
    async ({ result, winningBidId, expectedStatus }) => {
      findFirst.mockResolvedValue(
        auctionRow({
          endsAt: '2030-01-01T11:00:00.000Z',
          result,
          winningBidId,
        }),
      );

      const detail = await service.getDealerAuctionDetail(
        'auction-id',
        'dealer-id',
      );

      expect(detail.myBid?.status).toBe(expectedStatus);
    },
  );

  it('returns not found for a missing or inaccessible auction', async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      service.getDealerAuctionDetail('auction-id', 'dealer-id'),
    ).rejects.toEqual(new NotFoundException('Auction not found'));
  });
});

function auctionRow(
  overrides: Partial<{
    startsAt: string;
    endsAt: string;
    result: 'SOLD' | 'UNSOLD' | null;
    winningBidId: string | null;
    bids: {
      id: string;
      amount: number;
      placedAt: Date;
    }[];
  }> = {},
) {
  return {
    id: 'auction-id',
    startsAt: new Date(overrides.startsAt ?? '2030-01-01T10:00:00.000Z'),
    endsAt: new Date(overrides.endsAt ?? '2030-01-01T14:00:00.000Z'),
    startingPrice: 20_000,
    minIncrement: 250,
    result: overrides.result ?? null,
    winningBidId: overrides.winningBidId ?? null,
    vehicle: {
      id: 'vehicle-id',
      vin: '5YJ3E7EA1KF000001',
      make: 'Tesla',
      model: 'Model 3',
      year: 2022,
      mileageKm: 32_000,
      batteryCapacityKwh: { toNumber: () => 75.5 },
      batteryHealthPercent: { toNumber: () => 92.25 },
      rangeKm: 480,
      registrationDate: new Date('2022-03-15T00:00:00.000Z'),
      conditionNotes: 'Minor cosmetic wear.',
      photoUrls: ['https://example.com/vehicle.jpg'],
      city: 'Madrid',
      country: 'Spain',
    },
    bids: overrides.bids ?? [
      {
        id: 'dealer-bid-id',
        amount: 21_000,
        placedAt: new Date('2030-01-01T11:30:00.000Z'),
      },
    ],
  };
}
