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
