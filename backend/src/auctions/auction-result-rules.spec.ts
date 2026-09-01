import { decideAuctionResult } from './auction-result-rules.js';

describe('decideAuctionResult', () => {
  it('assigns the highest bid when a sold result meets the reserve', () => {
    expect(
      decideAuctionResult({
        requestedResult: 'SOLD',
        reservePrice: 20_000,
        highestBid: { id: 'winning-bid-id', amount: 20_000 },
      }),
    ).toEqual({
      valid: true,
      result: 'SOLD',
      winningBidId: 'winning-bid-id',
    });
  });

  it('rejects sold when there are no bids', () => {
    expect(
      decideAuctionResult({
        requestedResult: 'SOLD',
        reservePrice: 20_000,
        highestBid: null,
      }),
    ).toEqual({ valid: false, reason: 'NO_BIDS' });
  });

  it('rejects sold when the highest bid is below the reserve', () => {
    expect(
      decideAuctionResult({
        requestedResult: 'SOLD',
        reservePrice: 20_000,
        highestBid: { id: 'highest-bid-id', amount: 19_999 },
      }),
    ).toEqual({
      valid: false,
      reason: 'RESERVE_NOT_MET',
      highestBidAmount: 19_999,
    });
  });

  it('does not assign a bid to an unsold result', () => {
    expect(
      decideAuctionResult({
        requestedResult: 'UNSOLD',
        reservePrice: 20_000,
        highestBid: { id: 'qualifying-bid-id', amount: 25_000 },
      }),
    ).toEqual({ valid: true, result: 'UNSOLD', winningBidId: null });
  });
});
