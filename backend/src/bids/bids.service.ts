import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { validateBid } from './bid-rules.js';

const MAX_TRANSACTION_ATTEMPTS = 3;

interface PlaceBidInput {
  auctionId: string;
  dealerId: string;
  amount: number;
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
}
