export type AdminAuctionStatus = "SCHEDULED" | "LIVE" | "ENDED";
export type AdminAuctionResult = "SOLD" | "UNSOLD" | null;

export interface AdminAuction {
  id: string;
  status: AdminAuctionStatus;
  startsAt: string;
  endsAt: string;
  startingPrice: number;
  reservePrice: number;
  minIncrement: number;
  result: AdminAuctionResult;
  resultConfirmedAt: string | null;
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
      placedAt: string;
      dealerId: string;
      dealershipName: string | null;
    } | null;
    reserveMet: boolean | null;
  };
}

export interface AdminAuctionDetail {
  id: string;
  status: AdminAuctionStatus;
  startsAt: string;
  endsAt: string;
  startingPrice: number;
  reservePrice: number;
  minIncrement: number;
  reserveMet: boolean;
  result: AdminAuctionResult;
  winningBidId: string | null;
  resultConfirmedAt: string | null;
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
  bids: {
    id: string;
    amount: number;
    placedAt: string;
    dealer: {
      id: string;
      name: string;
      dealershipName: string | null;
    };
  }[];
}

export interface ConfirmAuctionResultResponse {
  auctionId: string;
  result: Exclude<AdminAuctionResult, null>;
  winningBid: {
    id: string;
    dealerId: string;
    amount: number;
    placedAt: string;
  } | null;
  resultConfirmedAt: string;
}

export interface CreateVehicleAuctionInput {
  vehicle: {
    vin: string;
    make: string;
    model: string;
    year: number;
    mileageKm: number;
    batteryCapacityKwh: number;
    batteryHealthPercent: number;
    rangeKm: number;
    registrationDate: string;
    conditionNotes?: string;
    photoUrls?: string[];
    city: string;
    country: string;
  };
  auction: {
    startsAt: string;
    endsAt?: string;
    startingPrice: number;
    reservePrice: number;
    minIncrement: number;
  };
}

export interface CreateVehicleAuctionResponse {
  id: string;
  status: AdminAuctionStatus;
  startsAt: string;
  endsAt: string;
  startingPrice: number;
  reservePrice: number;
  minIncrement: number;
  result: null;
  resultConfirmedAt: null;
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
