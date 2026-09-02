import type { DealerBidStatus } from "@/features/bids/dealer/types";

export type DealerAuctionStatus = "SCHEDULED" | "LIVE" | "ENDED";

export interface DealerAuction {
  id: string;
  status: DealerAuctionStatus;
  startsAt: string;
  endsAt: string;
  startingPrice: number;
  minIncrement: number;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    mileageKm: number;
    batteryCapacityKwh: number;
    batteryHealthPercent: number;
    rangeKm: number;
    photoUrls: string[];
    city: string;
    country: string;
  };
}

export interface DealerAuctionDetail extends DealerAuction {
  nextMinimumBidAmount: number | null;
  myBid: {
    amount: number;
    placedAt: string;
    status: DealerBidStatus;
  } | null;
  vehicle: DealerAuction["vehicle"] & {
    vin: string;
    registrationDate: string;
    conditionNotes: string | null;
  };
}
