import type { AuctionStatus } from '../auctions/auctions.types.js';

export type BidStatus =
  'WON' | 'LOST' | 'AWAITING_REVIEW' | 'ACTIVE' | 'UNSOLD';

export interface BidsListingItem {
  auctionId: string;
  vehicle: {
    make: string;
    model: string;
    year: number;
  };
  bid: {
    amount: number;
    placedAt: Date;
    status: BidStatus;
    nextMinimumAmount: number | null;
  };
  auctionStatus: AuctionStatus;
  endsAt: Date;
}
