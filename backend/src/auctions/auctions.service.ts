import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { AuctionResult } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { decideAuctionResult } from './auction-result-rules.js';
import type { AuctionStatus, DealerAuctionListItem } from './auctions.types.js';

const MAX_TRANSACTION_ATTEMPTS = 3;

interface ConfirmResultInput {
  auctionId: string;
  result: AuctionResult;
}

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

  async confirmResult(input: ConfirmResultInput) {
    for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          (transaction) => this.confirmResultInTransaction(transaction, input),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        const shouldRetry =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < MAX_TRANSACTION_ATTEMPTS;

        if (!shouldRetry) {
          throw error;
        }
      }
    }

    throw new Error('Result transaction retry loop completed unexpectedly.');
  }

  private async confirmResultInTransaction(
    transaction: Prisma.TransactionClient,
    { auctionId, result }: ConfirmResultInput,
  ) {
    const auction = await transaction.auction.findUnique({
      where: { id: auctionId },
      select: {
        endsAt: true,
        reservePrice: true,
        result: true,
      },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    const confirmedAt = new Date();

    if (confirmedAt < auction.endsAt) {
      throw new ConflictException('The auction has not ended yet.');
    }

    if (auction.result !== null) {
      throw new ConflictException('The auction result is already confirmed.');
    }

    const highestBid =
      result === 'SOLD'
        ? await transaction.bid.findFirst({
            where: { auctionId },
            select: {
              id: true,
              amount: true,
            },
            orderBy: [{ amount: 'desc' }, { placedAt: 'asc' }, { id: 'asc' }],
          })
        : null;

    const decision = decideAuctionResult({
      requestedResult: result,
      reservePrice: auction.reservePrice,
      highestBid,
    });

    if (!decision.valid) {
      if (decision.reason === 'NO_BIDS') {
        throw new BadRequestException(
          'An auction without bids cannot be confirmed as sold.',
        );
      }

      throw new BadRequestException(
        'The highest bid does not meet the reserve price.',
      );
    }

    const updateResult = await transaction.auction.updateMany({
      where: {
        id: auctionId,
        result: null,
      },
      data: {
        result: decision.result,
        winningBidId: decision.winningBidId,
        resultConfirmedAt: confirmedAt,
      },
    });

    if (updateResult.count !== 1) {
      throw new ConflictException('The auction result is already confirmed.');
    }

    const confirmedAuction = await transaction.auction.findUniqueOrThrow({
      where: { id: auctionId },
      select: {
        id: true,
        result: true,
        resultConfirmedAt: true,
        winningBid: {
          select: {
            id: true,
            dealerId: true,
            amount: true,
            placedAt: true,
          },
        },
      },
    });

    return {
      auctionId: confirmedAuction.id,
      result: confirmedAuction.result,
      winningBid: confirmedAuction.winningBid,
      resultConfirmedAt: confirmedAuction.resultConfirmedAt,
    };
  }

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
