import type { AuctionStatus } from '../auctions/auctions.types.js';
import type { AuctionResult } from '../generated/prisma/enums.js';
import type { BidStatus } from './bids.types.js';

export interface DealerBidStatusParams {
  auctionResult: AuctionResult | null;
  auctionStatus: AuctionStatus;
  winningBidId: string | null;
  dealerBidId: string;
}

export function deriveDealerBidStatus({
  auctionResult,
  auctionStatus,
  winningBidId,
  dealerBidId,
}: DealerBidStatusParams): BidStatus {
  if (auctionStatus === 'ENDED') {
    if (auctionResult === 'SOLD') {
      return winningBidId !== null && winningBidId === dealerBidId
        ? 'WON'
        : 'LOST';
    } else if (auctionResult === 'UNSOLD') {
      return 'UNSOLD';
    } else {
      return 'AWAITING_REVIEW';
    }
  } else {
    return 'ACTIVE';
  }
}
