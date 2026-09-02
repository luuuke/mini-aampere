import { PrismaService } from '../prisma/prisma.service.js';
import { AuctionsService } from './auctions.service.js';

describe('AuctionsService admin listing', () => {
  const findMany = vi.fn();
  const service = new AuctionsService({
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

  it('returns all auctions with admin fields in deterministic order', async () => {
    findMany.mockResolvedValue([
      auctionRow({
        id: 'ended-auction',
        startsAt: '2029-12-31T10:00:00.000Z',
        endsAt: '2030-01-01T11:00:00.000Z',
      }),
      auctionRow({ id: 'live-auction' }),
    ]);

    const result = await service.listAdminAuctions();

    expect(result).toEqual([
      {
        id: 'ended-auction',
        status: 'ENDED',
        startsAt: new Date('2029-12-31T10:00:00.000Z'),
        endsAt: new Date('2030-01-01T11:00:00.000Z'),
        startingPrice: 20_000,
        reservePrice: 22_000,
        minIncrement: 250,
        result: null,
        resultConfirmedAt: null,
        vehicle: {
          id: 'ended-auction-vehicle',
          vin: '5YJ3E7EA1KF000001',
          make: 'Tesla',
          model: 'Model 3',
          year: 2022,
          mileageKm: 32_000,
          primaryPhotoUrl: 'https://example.com/vehicle.jpg',
          city: 'Madrid',
          country: 'Spain',
        },
        bidSummary: {
          count: 3,
          highestBid: {
            id: 'highest-bid-id',
            amount: 23_000,
            placedAt: new Date('2030-01-01T10:30:00.000Z'),
            dealerId: 'dealer-id',
            dealershipName: 'Iberia EV',
          },
          reserveMet: true,
        },
      },
      expect.objectContaining({
        id: 'live-auction',
        status: 'LIVE',
        reservePrice: 22_000,
        bidSummary: {
          count: 3,
          highestBid: null,
          reserveMet: null,
        },
      }),
    ]);

    expect(findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        startingPrice: true,
        reservePrice: true,
        minIncrement: true,
        result: true,
        resultConfirmedAt: true,
        vehicle: {
          select: {
            id: true,
            vin: true,
            make: true,
            model: true,
            year: true,
            mileageKm: true,
            photoUrls: true,
            city: true,
            country: true,
          },
        },
        _count: { select: { bids: true } },
        bids: {
          orderBy: [{ amount: 'desc' }, { placedAt: 'asc' }, { id: 'asc' }],
          take: 1,
          select: {
            id: true,
            amount: true,
            placedAt: true,
            dealerId: true,
            dealer: { select: { dealershipName: true } },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  });

  it('returns an empty list when there are no auctions', async () => {
    findMany.mockResolvedValue([]);

    await expect(service.listAdminAuctions()).resolves.toEqual([]);
  });

  it('reports an unmet reserve for an ended auction without bids', async () => {
    findMany.mockResolvedValue([
      auctionRow({
        endsAt: '2030-01-01T12:00:00.000Z',
        bids: [],
        bidCount: 0,
        photoUrls: [],
      }),
    ]);

    await expect(service.listAdminAuctions()).resolves.toEqual([
      expect.objectContaining({
        status: 'ENDED',
        vehicle: expect.objectContaining({ primaryPhotoUrl: null }),
        bidSummary: {
          count: 0,
          highestBid: null,
          reserveMet: false,
        },
      }),
    ]);
  });
});

function auctionRow(
  overrides: Partial<{
    id: string;
    startsAt: string;
    endsAt: string;
    bids: ReturnType<typeof highestBidRow>[];
    bidCount: number;
    photoUrls: string[];
  }> = {},
) {
  const id = overrides.id ?? 'live-auction';

  return {
    id,
    startsAt: new Date(overrides.startsAt ?? '2030-01-01T10:00:00.000Z'),
    endsAt: new Date(overrides.endsAt ?? '2030-01-01T14:00:00.000Z'),
    startingPrice: 20_000,
    reservePrice: 22_000,
    minIncrement: 250,
    result: null,
    resultConfirmedAt: null,
    vehicle: {
      id: `${id}-vehicle`,
      vin: '5YJ3E7EA1KF000001',
      make: 'Tesla',
      model: 'Model 3',
      year: 2022,
      mileageKm: 32_000,
      photoUrls: overrides.photoUrls ?? ['https://example.com/vehicle.jpg'],
      city: 'Madrid',
      country: 'Spain',
    },
    _count: { bids: overrides.bidCount ?? 3 },
    bids: overrides.bids ?? [highestBidRow()],
  };
}

function highestBidRow() {
  return {
    id: 'highest-bid-id',
    amount: 23_000,
    placedAt: new Date('2030-01-01T10:30:00.000Z'),
    dealerId: 'dealer-id',
    dealer: { dealershipName: 'Iberia EV' },
  };
}
