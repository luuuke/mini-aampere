import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { AuctionResult } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { resolveAuctionWindow } from './auction-creation-rules.js';
import { decideAuctionResult } from './auction-result-rules.js';
import { deriveAuctionStatus } from './auction-status.js';
import type {
  AdminAuctionCreationResult,
  DealerAuctionListItem,
} from './auctions.types.js';
import type { CreateVehicleAuctionDto } from './dto/create-vehicle-auction.dto.js';

const MAX_TRANSACTION_ATTEMPTS = 3;

interface ConfirmResultInput {
  auctionId: string;
  result: AuctionResult;
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

  async create(
    createVehicleAuctionDto: CreateVehicleAuctionDto,
  ): Promise<AdminAuctionCreationResult> {
    const startsAt = new Date(createVehicleAuctionDto.auction.startsAt);
    const requestedEndsAt = createVehicleAuctionDto.auction.endsAt
      ? new Date(createVehicleAuctionDto.auction.endsAt)
      : undefined;
    const windowResolution = resolveAuctionWindow({
      startsAt,
      endsAt: requestedEndsAt,
      now: new Date(),
    });

    if (!windowResolution.valid) {
      if (windowResolution.reason === 'END_NOT_AFTER_START') {
        throw new BadRequestException('endsAt must be later than startsAt.');
      }

      throw new BadRequestException('endsAt must be in the future.');
    }

    const { vehicle, auction } = createVehicleAuctionDto;

    try {
      const createdAuction = await this.prisma.auction.create({
        data: {
          startsAt,
          endsAt: windowResolution.endsAt,
          startingPrice: auction.startingPrice,
          reservePrice: auction.reservePrice,
          minIncrement: auction.minIncrement,
          vehicle: {
            create: {
              vin: vehicle.vin,
              make: vehicle.make,
              model: vehicle.model,
              year: vehicle.year,
              mileageKm: vehicle.mileageKm,
              batteryCapacityKwh: vehicle.batteryCapacityKwh,
              batteryHealthPercent: vehicle.batteryHealthPercent,
              rangeKm: vehicle.rangeKm,
              registrationDate: new Date(
                `${vehicle.registrationDate}T00:00:00.000Z`,
              ),
              conditionNotes: vehicle.conditionNotes ?? null,
              photoUrls: vehicle.photoUrls ?? [],
              city: vehicle.city,
              country: vehicle.country,
            },
          },
        },
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          startingPrice: true,
          reservePrice: true,
          minIncrement: true,
          result: true,
          resultConfirmedAt: true,
          vehicle: {
            select: {
              id: true,
              vin: true,
              make: true,
              model: true,
              year: true,
              mileageKm: true,
              batteryCapacityKwh: true,
              batteryHealthPercent: true,
              rangeKm: true,
              registrationDate: true,
              conditionNotes: true,
              photoUrls: true,
              city: true,
              country: true,
            },
          },
        },
      });

      return {
        id: createdAuction.id,
        status: deriveAuctionStatus(
          createdAuction.startsAt,
          createdAuction.endsAt,
          new Date(),
        ),
        startsAt: createdAuction.startsAt,
        endsAt: createdAuction.endsAt,
        startingPrice: createdAuction.startingPrice,
        reservePrice: createdAuction.reservePrice,
        minIncrement: createdAuction.minIncrement,
        result: createdAuction.result,
        resultConfirmedAt: createdAuction.resultConfirmedAt,
        winningBid: null,
        vehicle: {
          ...createdAuction.vehicle,
          registrationDate: createdAuction.vehicle.registrationDate
            .toISOString()
            .slice(0, 10),
          batteryCapacityKwh:
            createdAuction.vehicle.batteryCapacityKwh.toNumber(),
          batteryHealthPercent:
            createdAuction.vehicle.batteryHealthPercent.toNumber(),
        },
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A vehicle with this VIN already exists.');
      }

      throw error;
    }
  }

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
