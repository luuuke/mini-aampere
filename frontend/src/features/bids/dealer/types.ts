export type DealerBidStatus =
  | "ACTIVE"
  | "AWAITING_REVIEW"
  | "WON"
  | "LOST"
  | "UNSOLD";

export interface DealerBidListItem {
  auctionId: string;
  vehicle: {
    make: string;
    model: string;
    year: number;
  };
  bid: {
    amount: number;
    placedAt: string;
    status: DealerBidStatus;
    nextMinimumAmount: number | null;
  };
  auctionStatus: "SCHEDULED" | "LIVE" | "ENDED";
  endsAt: string;
}

export interface PlacedDealerBid {
  auctionId: string;
  dealerId: string;
  amount: number;
}
