import { deriveDealerBidStatus } from './bid-status.js';
import type { DealerBidStatusParams } from './bid-status.js';

describe('deriveDealerBidStatus', () => {
  it.each<{
    name: string;
    input: DealerBidStatusParams;
    expected: string;
  }>([
    {
      name: 'keeps a live bid active without revealing its rank',
      input: bidStatusInput({ auctionStatus: 'LIVE' }),
      expected: 'ACTIVE',
    },
    {
      name: 'awaits review after the auction ends',
      input: bidStatusInput({ auctionStatus: 'ENDED' }),
      expected: 'AWAITING_REVIEW',
    },
    {
      name: 'marks the confirmed winning bid as won',
      input: bidStatusInput({
        auctionStatus: 'ENDED',
        auctionResult: 'SOLD',
        winningBidId: 'dealer-bid-id',
      }),
      expected: 'WON',
    },
    {
      name: 'marks another confirmed winning bid as lost',
      input: bidStatusInput({
        auctionStatus: 'ENDED',
        auctionResult: 'SOLD',
        winningBidId: 'other-bid-id',
      }),
      expected: 'LOST',
    },
    {
      name: 'does not treat missing winning bid data as a win',
      input: bidStatusInput({
        auctionStatus: 'ENDED',
        auctionResult: 'SOLD',
        winningBidId: null,
      }),
      expected: 'LOST',
    },
    {
      name: 'reports a confirmed unsold auction',
      input: bidStatusInput({
        auctionStatus: 'ENDED',
        auctionResult: 'UNSOLD',
      }),
      expected: 'UNSOLD',
    },
  ])('$name', ({ input, expected }) => {
    expect(deriveDealerBidStatus(input)).toBe(expected);
  });
});

function bidStatusInput(
  overrides: Partial<DealerBidStatusParams> = {},
): DealerBidStatusParams {
  return {
    auctionResult: null,
    auctionStatus: 'LIVE',
    winningBidId: null,
    dealerBidId: 'dealer-bid-id',
    ...overrides,
  };
}
