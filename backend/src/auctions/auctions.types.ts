import type { BidStatus } from '../bids/bids.types.js';

export type AuctionStatus = 'SCHEDULED' | 'LIVE' | 'ENDED';

export interface DealerAuctionListItem {
  id: string;
  status: AuctionStatus;
  startsAt: Date;
  endsAt: Date;
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

export interface DealerAuctionDetail {
  id: string;
  status: AuctionStatus;
  startsAt: Date;
  endsAt: Date;
  startingPrice: number;
  minIncrement: number;
  nextMinimumBidAmount: number | null;
  myBid: {
    amount: number;
    placedAt: Date;
    status: BidStatus;
  } | null;
  vehicle: {
    id: string;
    vin: string;
    make: string;
    model: string;
    year: number;
    mileageKm: number;
    batteryCapacityKwh: number;
    batteryHealthPercent: number;
    rangeKm: number;
    registrationDate: string;
    conditionNotes: string | null;
    photoUrls: string[];
    city: string;
    country: string;
  };
}

export interface AdminAuctionListItem {
  id: string;
  status: AuctionStatus;
  startsAt: Date;
  endsAt: Date;
  startingPrice: number;
  reservePrice: number;
  minIncrement: number;
  result: 'SOLD' | 'UNSOLD' | null;
  resultConfirmedAt: Date | null;
  vehicle: {
    id: string;
    vin: string;
    make: string;
    model: string;
    year: number;
    mileageKm: number;
    primaryPhotoUrl: string | null;
    city: string;
    country: string;
  };
  bidSummary: {
    count: number;
    highestBid: {
      id: string;
      amount: number;
      placedAt: Date;
      dealerId: string;
      dealershipName: string | null;
    } | null;
    reserveMet: boolean | null;
  };
}

export interface AdminAuctionCreationResult {
  id: string;
  status: AuctionStatus;
  startsAt: Date;
  endsAt: Date;
  startingPrice: number;
  reservePrice: number;
  minIncrement: number;
  result: 'SOLD' | 'UNSOLD' | null;
  resultConfirmedAt: Date | null;
  winningBid: null;
  vehicle: {
    id: string;
    vin: string;
    make: string;
    model: string;
    year: number;
    mileageKm: number;
    batteryCapacityKwh: number;
    batteryHealthPercent: number;
    rangeKm: number;
    registrationDate: string;
    conditionNotes: string | null;
    photoUrls: string[];
    city: string;
    country: string;
  };
}
