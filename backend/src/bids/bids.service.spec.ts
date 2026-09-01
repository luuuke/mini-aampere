import { PrismaService } from '../prisma/prisma.service.js';
import { BidsService } from './bids.service.js';

describe('BidsService', () => {
  const findAuction = vi.fn();
  const findLatestBid = vi.fn();
  const createBid = vi.fn();
  const service = new BidsService({
    auction: { findFirst: findAuction },
    bid: { findFirst: findLatestBid, create: createBid },
  } as unknown as PrismaService);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a bid using only dealer-safe auction data and the dealer own latest bid', async () => {
    findAuction.mockResolvedValue(liveAuction());
    findLatestBid.mockResolvedValue({ amount: 21_000 });
    createBid.mockResolvedValue({ id: 'bid-id' });

    await service.placeBid({
      auctionId: 'auction-id',
      dealerId: 'dealer-id',
      amount: 21_250,
    });

    const auctionQuery = findAuction.mock.calls[0]?.[0];
    expect(auctionQuery).toEqual({
      where: { id: 'auction-id' },
      select: {
        startsAt: true,
        endsAt: true,
        startingPrice: true,
        minIncrement: true,
      },
    });
    expect(auctionQuery.select).not.toHaveProperty('reservePrice');
    expect(auctionQuery.select).not.toHaveProperty('bids');

    expect(findLatestBid).toHaveBeenCalledWith({
      where: {
        auctionId: 'auction-id',
        dealerId: 'dealer-id',
      },
      select: { amount: true },
      orderBy: [{ placedAt: 'desc' }],
    });
    expect(createBid).toHaveBeenCalledWith({
      data: {
        auctionId: 'auction-id',
        dealerId: 'dealer-id',
        amount: 21_250,
      },
      select: {
        auctionId: true,
        dealerId: true,
        amount: true,
      },
    });
  });

  it('rejects an unknown auction before looking up or creating a bid', async () => {
    findAuction.mockResolvedValue(null);

    await expect(
      service.placeBid({
        auctionId: 'missing-auction-id',
        dealerId: 'dealer-id',
        amount: 20_000,
      }),
    ).rejects.toMatchObject({
      status: 404,
      message: 'Auction not found',
    });

    expect(findLatestBid).not.toHaveBeenCalled();
    expect(createBid).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'not started',
      auction: liveAuction({
        startsAt: new Date('2030-01-01T13:00:00.000Z'),
      }),
      message: 'The auction has not started yet.',
    },
    {
      name: 'ended',
      auction: liveAuction({
        endsAt: new Date('2030-01-01T12:00:00.000Z'),
      }),
      message: 'The auction has already ended.',
    },
  ])('rejects an auction that has $name', async ({ auction, message }) => {
    findAuction.mockResolvedValue(auction);
    findLatestBid.mockResolvedValue(null);

    await expect(
      service.placeBid({
        auctionId: 'auction-id',
        dealerId: 'dealer-id',
        amount: 20_000,
      }),
    ).rejects.toMatchObject({ status: 409, message });

    expect(createBid).not.toHaveBeenCalled();
  });

  it('rejects an amount below the dealer required minimum', async () => {
    findAuction.mockResolvedValue(liveAuction());
    findLatestBid.mockResolvedValue({ amount: 21_000 });

    await expect(
      service.placeBid({
        auctionId: 'auction-id',
        dealerId: 'dealer-id',
        amount: 21_249,
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'The given amount is lower than the minimum amount of 21250.',
    });

    expect(createBid).not.toHaveBeenCalled();
  });
});

function liveAuction(
  overrides: Partial<{
    startsAt: Date;
    endsAt: Date;
    startingPrice: number;
    minIncrement: number;
  }> = {},
) {
  return {
    startsAt: new Date('2030-01-01T10:00:00.000Z'),
    endsAt: new Date('2030-01-01T14:00:00.000Z'),
    startingPrice: 20_000,
    minIncrement: 250,
    ...overrides,
  };
}
