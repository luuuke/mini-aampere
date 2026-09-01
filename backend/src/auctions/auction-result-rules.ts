import type { AuctionResult } from '../generated/prisma/client.js';

interface WinningBidCandidate {
  id: string;
  amount: number;
}

interface DecideAuctionResultInput {
  requestedResult: AuctionResult;
  reservePrice: number;
  highestBid: WinningBidCandidate | null;
}

export type AuctionResultDecision =
  | { valid: true; result: 'SOLD'; winningBidId: string }
  | { valid: true; result: 'UNSOLD'; winningBidId: null }
  | { valid: false; reason: 'NO_BIDS' }
  | {
      valid: false;
      reason: 'RESERVE_NOT_MET';
      highestBidAmount: number;
    };

export function decideAuctionResult({
  requestedResult,
  reservePrice,
  highestBid,
}: DecideAuctionResultInput): AuctionResultDecision {
  if (requestedResult === 'UNSOLD') {
    return { valid: true, result: 'UNSOLD', winningBidId: null };
  }

  if (!highestBid) {
    return { valid: false, reason: 'NO_BIDS' };
  }

  if (highestBid.amount < reservePrice) {
    return {
      valid: false,
      reason: 'RESERVE_NOT_MET',
      highestBidAmount: highestBid.amount,
    };
  }

  return {
    valid: true,
    result: 'SOLD',
    winningBidId: highestBid.id,
  };
}
