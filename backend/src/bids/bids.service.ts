import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { validateBid } from './bid-rules.js';

@Injectable()
export class BidsService {
  constructor(private readonly prisma: PrismaService) {}

  async placeBid({
    auctionId,
    dealerId,
    amount,
  }: {
    auctionId: string;
    dealerId: string;
    amount: number;
  }) {
    const auction = await this.prisma.auction.findFirst({
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

    const latestBid = await this.prisma.bid.findFirst({
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

    await this.prisma.bid.create({
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
