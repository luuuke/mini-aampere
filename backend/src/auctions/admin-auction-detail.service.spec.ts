import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuctionsService } from './auctions.service.js';

describe('AuctionsService admin detail', () => {
  const findUnique = vi.fn();
  const service = new AuctionsService({
    auction: { findUnique },
  } as unknown as PrismaService);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns full auction, vehicle, bid, and result information', async () => {
    findUnique.mockResolvedValue(auctionRow());

    await expect(service.getAdminAuctionDetail('auction-id')).resolves.toEqual({
      id: 'auction-id',
      status: 'ENDED',
      startsAt: new Date('2030-01-01T10:00:00.000Z'),
      endsAt: new Date('2030-01-01T12:00:00.000Z'),
      startingPrice: 20_000,
      reservePrice: 22_000,
      minIncrement: 250,
      reserveMet: true,
      result: null,
      winningBidId: null,
      resultConfirmedAt: null,
      vehicle: {
        id: 'vehicle-id',
        vin: '5YJ3E7EA1KF000001',
        make: 'Tesla',
        model: 'Model 3',
        year: 2022,
        mileageKm: 32_000,
        batteryCapacityKwh: 75.5,
        batteryHealthPercent: 92.25,
        rangeKm: 480,
        registrationDate: '2022-03-15',
        conditionNotes: 'Minor cosmetic wear.',
        photoUrls: ['https://example.com/vehicle.jpg'],
        city: 'Madrid',
        country: 'Spain',
      },
      bids: [
        {
          id: 'highest-bid-id',
          amount: 23_000,
          placedAt: new Date('2030-01-01T11:30:00.000Z'),
          dealer: {
            id: 'dealer-id',
            name: 'Sofia García',
            dealershipName: 'Iberia EV',
          },
        },
      ],
    });

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'auction-id' },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        startingPrice: true,
        reservePrice: true,
        minIncrement: true,
        result: true,
        winningBidId: true,
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
        bids: {
          orderBy: [{ amount: 'desc' }, { placedAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            amount: true,
            placedAt: true,
            dealer: {
              select: {
                id: true,
                name: true,
                dealershipName: true,
              },
            },
          },
        },
      },
    });
  });

  it('reports an unmet reserve when there are no bids', async () => {
    findUnique.mockResolvedValue(auctionRow({ bids: [] }));

    await expect(
      service.getAdminAuctionDetail('auction-id'),
    ).resolves.toMatchObject({
      reserveMet: false,
      bids: [],
    });
  });

  it('returns not found for a missing auction', async () => {
    findUnique.mockResolvedValue(null);

    await expect(service.getAdminAuctionDetail('auction-id')).rejects.toEqual(
      new NotFoundException('Auction not found'),
    );
  });
});

function auctionRow(
  overrides: Partial<{
    bids: {
      id: string;
      amount: number;
      placedAt: Date;
      dealer: {
        id: string;
        name: string;
        dealershipName: string | null;
      };
    }[];
  }> = {},
) {
  return {
    id: 'auction-id',
    startsAt: new Date('2030-01-01T10:00:00.000Z'),
    endsAt: new Date('2030-01-01T12:00:00.000Z'),
    startingPrice: 20_000,
    reservePrice: 22_000,
    minIncrement: 250,
    result: null,
    winningBidId: null,
    resultConfirmedAt: null,
    vehicle: {
      id: 'vehicle-id',
      vin: '5YJ3E7EA1KF000001',
      make: 'Tesla',
      model: 'Model 3',
      year: 2022,
      mileageKm: 32_000,
      batteryCapacityKwh: { toNumber: () => 75.5 },
      batteryHealthPercent: { toNumber: () => 92.25 },
      rangeKm: 480,
      registrationDate: new Date('2022-03-15T00:00:00.000Z'),
      conditionNotes: 'Minor cosmetic wear.',
      photoUrls: ['https://example.com/vehicle.jpg'],
      city: 'Madrid',
      country: 'Spain',
    },
    bids: overrides.bids ?? [
      {
        id: 'highest-bid-id',
        amount: 23_000,
        placedAt: new Date('2030-01-01T11:30:00.000Z'),
        dealer: {
          id: 'dealer-id',
          name: 'Sofia García',
          dealershipName: 'Iberia EV',
        },
      },
    ],
  };
}
