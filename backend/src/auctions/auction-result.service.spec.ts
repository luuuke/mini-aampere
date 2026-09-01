import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuctionsService } from './auctions.service.js';

describe('AuctionsService result confirmation', () => {
  const runTransaction = vi.fn();
  const findAuction = vi.fn();
  const findHighestBid = vi.fn();
  const updateAuction = vi.fn();
  const findConfirmedAuction = vi.fn();
  const transaction = {
    auction: {
      findUnique: findAuction,
      updateMany: updateAuction,
      findUniqueOrThrow: findConfirmedAuction,
    },
    bid: { findFirst: findHighestBid },
  };
  const service = new AuctionsService({
    $transaction: runTransaction,
  } as unknown as PrismaService);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T12:00:00.000Z'));
    runTransaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );
    updateAuction.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('confirms sold and assigns the deterministically selected bid id', async () => {
    findAuction.mockResolvedValue(endedAuction());
    findHighestBid.mockResolvedValue({ id: 'winning-bid-id', amount: 20_000 });
    findConfirmedAuction.mockResolvedValue({
      id: 'auction-id',
      result: 'SOLD',
      winningBid: {
        id: 'winning-bid-id',
        dealerId: 'dealer-id',
        amount: 20_000,
        placedAt: new Date('2030-01-01T11:00:00.000Z'),
      },
      resultConfirmedAt: new Date('2030-01-01T12:00:00.000Z'),
    });

    await expect(
      service.confirmResult({ auctionId: 'auction-id', result: 'SOLD' }),
    ).resolves.toEqual({
      auctionId: 'auction-id',
      result: 'SOLD',
      winningBid: {
        id: 'winning-bid-id',
        dealerId: 'dealer-id',
        amount: 20_000,
        placedAt: new Date('2030-01-01T11:00:00.000Z'),
      },
      resultConfirmedAt: new Date('2030-01-01T12:00:00.000Z'),
    });

    expect(runTransaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(findHighestBid).toHaveBeenCalledWith({
      where: { auctionId: 'auction-id' },
      select: { id: true, amount: true },
      orderBy: [{ amount: 'desc' }, { placedAt: 'asc' }, { id: 'asc' }],
    });
    expect(updateAuction).toHaveBeenCalledWith({
      where: { id: 'auction-id', result: null },
      data: {
        result: 'SOLD',
        winningBidId: 'winning-bid-id',
        resultConfirmedAt: new Date('2030-01-01T12:00:00.000Z'),
      },
    });
  });

  it('confirms unsold without selecting or assigning a bid', async () => {
    findAuction.mockResolvedValue(endedAuction());
    findConfirmedAuction.mockResolvedValue({
      id: 'auction-id',
      result: 'UNSOLD',
      winningBid: null,
      resultConfirmedAt: new Date('2030-01-01T12:00:00.000Z'),
    });

    await expect(
      service.confirmResult({ auctionId: 'auction-id', result: 'UNSOLD' }),
    ).resolves.toMatchObject({
      auctionId: 'auction-id',
      result: 'UNSOLD',
      winningBid: null,
    });

    expect(findHighestBid).not.toHaveBeenCalled();
    expect(updateAuction).toHaveBeenCalledWith({
      where: { id: 'auction-id', result: null },
      data: {
        result: 'UNSOLD',
        winningBidId: null,
        resultConfirmedAt: new Date('2030-01-01T12:00:00.000Z'),
      },
    });
  });

  it('allows confirmation exactly when the auction ends', async () => {
    findAuction.mockResolvedValue(
      endedAuction({ endsAt: new Date('2030-01-01T12:00:00.000Z') }),
    );
    findConfirmedAuction.mockResolvedValue({
      id: 'auction-id',
      result: 'UNSOLD',
      winningBid: null,
      resultConfirmedAt: new Date('2030-01-01T12:00:00.000Z'),
    });

    await expect(
      service.confirmResult({ auctionId: 'auction-id', result: 'UNSOLD' }),
    ).resolves.toMatchObject({ result: 'UNSOLD' });
  });

  it.each([
    {
      name: 'unknown',
      auction: null,
      status: 404,
      message: 'Auction not found',
    },
    {
      name: 'not ended',
      auction: endedAuction({
        endsAt: new Date('2030-01-01T12:00:00.001Z'),
      }),
      status: 409,
      message: 'The auction has not ended yet.',
    },
    {
      name: 'already confirmed',
      auction: endedAuction({ result: 'SOLD' }),
      status: 409,
      message: 'The auction result is already confirmed.',
    },
  ])(
    'rejects an auction that is $name',
    async ({ auction, status, message }) => {
      findAuction.mockResolvedValue(auction);

      await expect(
        service.confirmResult({ auctionId: 'auction-id', result: 'UNSOLD' }),
      ).rejects.toMatchObject({ status, message });

      expect(findHighestBid).not.toHaveBeenCalled();
      expect(updateAuction).not.toHaveBeenCalled();
    },
  );

  it.each([
    {
      name: 'has no bids',
      highestBid: null,
      message: 'An auction without bids cannot be confirmed as sold.',
    },
    {
      name: 'has not met its reserve',
      highestBid: { id: 'highest-bid-id', amount: 19_999 },
      message: 'The highest bid does not meet the reserve price.',
    },
  ])('rejects sold when the auction $name', async ({ highestBid, message }) => {
    findAuction.mockResolvedValue(endedAuction());
    findHighestBid.mockResolvedValue(highestBid);

    await expect(
      service.confirmResult({ auctionId: 'auction-id', result: 'SOLD' }),
    ).rejects.toMatchObject({ status: 400, message });

    expect(updateAuction).not.toHaveBeenCalled();
  });

  it('rejects a concurrent confirmation that updates no pending auction', async () => {
    findAuction.mockResolvedValue(endedAuction());
    updateAuction.mockResolvedValue({ count: 0 });

    await expect(
      service.confirmResult({ auctionId: 'auction-id', result: 'UNSOLD' }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'The auction result is already confirmed.',
    });

    expect(findConfirmedAuction).not.toHaveBeenCalled();
  });

  it('retries the transaction after a serializable write conflict', async () => {
    const writeConflict = new Prisma.PrismaClientKnownRequestError(
      'Transaction write conflict',
      { code: 'P2034', clientVersion: '7.10.0' },
    );
    findAuction.mockResolvedValue(endedAuction());
    findConfirmedAuction.mockResolvedValue({
      id: 'auction-id',
      result: 'UNSOLD',
      winningBid: null,
      resultConfirmedAt: new Date('2030-01-01T12:00:00.000Z'),
    });
    updateAuction
      .mockRejectedValueOnce(writeConflict)
      .mockResolvedValueOnce({ count: 1 });

    await service.confirmResult({ auctionId: 'auction-id', result: 'UNSOLD' });

    expect(runTransaction).toHaveBeenCalledTimes(2);
    expect(findAuction).toHaveBeenCalledTimes(2);
    expect(updateAuction).toHaveBeenCalledTimes(2);
  });
});

function endedAuction(
  overrides: Partial<{
    endsAt: Date;
    reservePrice: number;
    result: 'SOLD' | 'UNSOLD' | null;
  }> = {},
) {
  return {
    endsAt: new Date('2030-01-01T11:59:59.999Z'),
    reservePrice: 20_000,
    result: null,
    ...overrides,
  };
}
