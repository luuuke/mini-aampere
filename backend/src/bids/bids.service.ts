import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { deriveAuctionStatus } from '../auctions/auction-status.js';
import { validateBid } from './bid-rules.js';
import { deriveDealerBidStatus } from './bid-status.js';
import type { BidsListingItem, BidStatus } from './bids.types.js';

const MAX_TRANSACTION_ATTEMPTS = 3;

interface PlaceBidInput {
  auctionId: string;
  dealerId: string;
  amount: number;
}

const BID_STATUS_PRIORITY: Record<BidStatus, number> = {
  ACTIVE: 0,
  AWAITING_REVIEW: 1,
  WON: 2,
  LOST: 2,
  UNSOLD: 2,
};

function compareDealerBids(
  first: BidsListingItem,
  second: BidsListingItem,
): number {
  const priorityDifference =
    BID_STATUS_PRIORITY[first.bid.status] -
    BID_STATUS_PRIORITY[second.bid.status];

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  const timeDifference =
    first.bid.status === 'ACTIVE'
      ? first.endsAt.getTime() - second.endsAt.getTime()
      : second.endsAt.getTime() - first.endsAt.getTime();

  return timeDifference || first.auctionId.localeCompare(second.auctionId);
}

@Injectable()
export class BidsService {
  constructor(private readonly prisma: PrismaService) {}

  async placeBid(input: PlaceBidInput) {
    for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          (transaction) => this.placeBidInTransaction(transaction, input),
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

    throw new Error('Bid transaction retry loop completed unexpectedly.');
  }

  private async placeBidInTransaction(
    transaction: Prisma.TransactionClient,
    { auctionId, dealerId, amount }: PlaceBidInput,
  ) {
    const auction = await transaction.auction.findFirst({
      where: {
        id: auctionId,
      },
      select: {
        startsAt: true,
        endsAt: true,
        startingPrice: true,
        minIncrement: true,
      },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    const latestBid = await transaction.bid.findFirst({
      where: {
        auctionId: auctionId,
        dealerId: dealerId,
      },
      select: {
        amount: true,
      },
      orderBy: [{ placedAt: 'desc' }],
    });

    const bidValidationResult = validateBid({
      ...auction,
      previousBidAmount: latestBid?.amount ?? null,
      amount,
      now: new Date(),
    });

    if (!bidValidationResult.valid) {
      if (bidValidationResult.reason === 'ENDED') {
        throw new ConflictException('The auction has already ended.');
      }
      if (bidValidationResult.reason === 'NOT_STARTED') {
        throw new ConflictException('The auction has not started yet.');
      }
      if (bidValidationResult.reason === 'AMOUNT_TOO_LOW') {
        throw new BadRequestException(
          `The given amount is lower than the minimum amount of ${bidValidationResult.minimumAmount}.`,
        );
      }
    }

    return transaction.bid.create({
      data: {
        auctionId,
        dealerId,
        amount,
      },
      select: {
        auctionId: true,
        dealerId: true,
        amount: true,
      },
    });
  }

  async listDealerBids(dealerId: string): Promise<BidsListingItem[]> {
    const now = new Date();

    const auctions = await this.prisma.auction.findMany({
      where: {
        bids: {
          some: { dealerId },
        },
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        minIncrement: true,
        result: true,
        winningBidId: true,

        vehicle: {
          select: {
            make: true,
            model: true,
            year: true,
          },
        },

        bids: {
          where: {
            dealerId,
          },
          orderBy: [{ placedAt: 'desc' }, { id: 'desc' }],
          take: 1,
          select: {
            id: true,
            amount: true,
            placedAt: true,
          },
        },
      },
    });

    return auctions
      .map((auction): BidsListingItem => {
        const dealerBid = auction.bids[0];

        if (!dealerBid) {
          throw new Error(
            'Dealer bid query returned an auction without a dealer bid.',
          );
        }

        const auctionStatus = deriveAuctionStatus(
          auction.startsAt,
          auction.endsAt,
          now,
        );

        return {
          auctionId: auction.id,
          vehicle: {
            make: auction.vehicle.make,
            model: auction.vehicle.model,
            year: auction.vehicle.year,
          },
          bid: {
            status: deriveDealerBidStatus({
              auctionStatus,
              auctionResult: auction.result,
              winningBidId: auction.winningBidId,
              dealerBidId: dealerBid.id,
            }),
            placedAt: dealerBid.placedAt,
            amount: dealerBid.amount,
            nextMinimumAmount:
              auctionStatus === 'LIVE'
                ? dealerBid.amount + auction.minIncrement
                : null,
          },
          auctionStatus,
          endsAt: auction.endsAt,
        };
      })
      .sort(compareDealerBids);
  }
}
