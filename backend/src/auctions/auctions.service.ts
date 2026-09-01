import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuctionStatus, DealerAuctionListItem } from './auctions.types.js';

function deriveAuctionStatus(
  startsAt: Date,
  endsAt: Date,
  now: Date,
): AuctionStatus {
  if (now < startsAt) {
    return 'SCHEDULED';
  }

  if (now < endsAt) {
    return 'LIVE';
  }

  return 'ENDED';
}

function compareDealerAuctions(
  first: DealerAuctionListItem,
  second: DealerAuctionListItem,
): number {
  if (first.status !== second.status) {
    return first.status === 'LIVE' ? -1 : 1;
  }

  const firstRelevantTime =
    first.status === 'LIVE' ? first.endsAt : first.startsAt;
  const secondRelevantTime =
    second.status === 'LIVE' ? second.endsAt : second.startsAt;
  const timeDifference =
    firstRelevantTime.getTime() - secondRelevantTime.getTime();

  return timeDifference || first.id.localeCompare(second.id);
}

@Injectable()
export class AuctionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listDealerAuctions(): Promise<DealerAuctionListItem[]> {
    const now = new Date();

    const auctions = await this.prisma.auction.findMany({
      where: {
        endsAt: { gt: now },
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        startingPrice: true,
        minIncrement: true,
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            mileageKm: true,
            batteryCapacityKwh: true,
            batteryHealthPercent: true,
            rangeKm: true,
            photoUrls: true,
            city: true,
            country: true,
          },
        },
      },
    });

    return auctions
      .map((auction): DealerAuctionListItem => ({
        id: auction.id,
        status: deriveAuctionStatus(auction.startsAt, auction.endsAt, now),
        startsAt: auction.startsAt,
        endsAt: auction.endsAt,
        startingPrice: auction.startingPrice,
        minIncrement: auction.minIncrement,
        vehicle: {
          id: auction.vehicle.id,
          make: auction.vehicle.make,
          model: auction.vehicle.model,
          year: auction.vehicle.year,
          mileageKm: auction.vehicle.mileageKm,
          batteryCapacityKwh: auction.vehicle.batteryCapacityKwh.toNumber(),
          batteryHealthPercent: auction.vehicle.batteryHealthPercent.toNumber(),
          rangeKm: auction.vehicle.rangeKm,
          photoUrls: auction.vehicle.photoUrls,
          city: auction.vehicle.city,
          country: auction.vehicle.country,
        },
      }))
      .sort(compareDealerAuctions);
  }
}
