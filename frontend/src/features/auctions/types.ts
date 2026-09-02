export type DealerAuctionStatus = "LIVE" | "SCHEDULED";

export interface DealerAuction {
  id: string;
  status: DealerAuctionStatus;
  startsAt: string;
  endsAt: string;
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
