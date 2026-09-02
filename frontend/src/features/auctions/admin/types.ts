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
