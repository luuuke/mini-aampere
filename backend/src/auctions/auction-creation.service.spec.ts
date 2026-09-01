import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuctionsService } from './auctions.service.js';
import type { CreateVehicleAuctionDto } from './dto/create-vehicle-auction.dto.js';

describe('AuctionsService auction creation', () => {
  const createAuction = vi.fn();
  const service = new AuctionsService({
    auction: { create: createAuction },
  } as unknown as PrismaService);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('atomically creates a vehicle and auction with a default 24-hour window', async () => {
    createAuction.mockResolvedValue(createdAuctionRow());

    await expect(service.create(createInput())).resolves.toEqual({
      id: 'auction-id',
      status: 'SCHEDULED',
      startsAt: new Date('2030-01-02T09:00:00.000Z'),
      endsAt: new Date('2030-01-03T09:00:00.000Z'),
      startingPrice: 24_000,
      reservePrice: 28_000,
      minIncrement: 250,
      result: null,
      resultConfirmedAt: null,
      winningBid: null,
      vehicle: {
        id: 'vehicle-id',
        vin: '5YJ3E7EA1KF000001',
        make: 'Tesla',
        model: 'Model 3 Long Range',
        year: 2022,
        mileageKm: 48_500,
        batteryCapacityKwh: 75,
        batteryHealthPercent: 93.5,
        rangeKm: 560,
        registrationDate: '2022-05-18',
        conditionNotes: null,
        photoUrls: [],
        city: 'Madrid',
        country: 'Spain',
      },
    });

    expect(createAuction).toHaveBeenCalledWith({
      data: {
        startsAt: new Date('2030-01-02T09:00:00.000Z'),
        endsAt: new Date('2030-01-03T09:00:00.000Z'),
        startingPrice: 24_000,
        reservePrice: 28_000,
        minIncrement: 250,
        vehicle: {
          create: {
            vin: '5YJ3E7EA1KF000001',
            make: 'Tesla',
            model: 'Model 3 Long Range',
            year: 2022,
            mileageKm: 48_500,
            batteryCapacityKwh: 75,
            batteryHealthPercent: 93.5,
            rangeKm: 560,
            registrationDate: new Date('2022-05-18T00:00:00.000Z'),
            conditionNotes: null,
            photoUrls: [],
            city: 'Madrid',
            country: 'Spain',
          },
        },
      },
      select: expect.objectContaining({
        reservePrice: true,
        vehicle: { select: expect.any(Object) },
      }),
    });
  });

  it('rejects an invalid time window before writing', async () => {
    await expect(
      service.create(
        createInput({
          endsAt: '2030-01-02T09:00:00.000Z',
        }),
      ),
    ).rejects.toMatchObject({
      status: 400,
      message: 'endsAt must be later than startsAt.',
    });

    expect(createAuction).not.toHaveBeenCalled();
  });

  it('maps a duplicate VIN constraint to a conflict response', async () => {
    createAuction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.10.0',
      }),
    );

    await expect(service.create(createInput())).rejects.toMatchObject({
      status: 409,
      message: 'A vehicle with this VIN already exists.',
    });
  });
});

function createInput(
  auctionOverrides: Partial<CreateVehicleAuctionDto['auction']> = {},
): CreateVehicleAuctionDto {
  return {
    vehicle: {
      vin: '5YJ3E7EA1KF000001',
      make: 'Tesla',
      model: 'Model 3 Long Range',
      year: 2022,
      mileageKm: 48_500,
      batteryCapacityKwh: 75,
      batteryHealthPercent: 93.5,
      rangeKm: 560,
      registrationDate: '2022-05-18',
      city: 'Madrid',
      country: 'Spain',
    },
    auction: {
      startsAt: '2030-01-02T09:00:00.000Z',
      startingPrice: 24_000,
      reservePrice: 28_000,
      minIncrement: 250,
      ...auctionOverrides,
    },
  };
}

function createdAuctionRow() {
  return {
    id: 'auction-id',
    startsAt: new Date('2030-01-02T09:00:00.000Z'),
    endsAt: new Date('2030-01-03T09:00:00.000Z'),
    startingPrice: 24_000,
    reservePrice: 28_000,
    minIncrement: 250,
    result: null,
    resultConfirmedAt: null,
    vehicle: {
      id: 'vehicle-id',
      vin: '5YJ3E7EA1KF000001',
      make: 'Tesla',
      model: 'Model 3 Long Range',
      year: 2022,
      mileageKm: 48_500,
      batteryCapacityKwh: { toNumber: () => 75 },
      batteryHealthPercent: { toNumber: () => 93.5 },
      rangeKm: 560,
      registrationDate: new Date('2022-05-18T00:00:00.000Z'),
      conditionNotes: null,
      photoUrls: [],
      city: 'Madrid',
      country: 'Spain',
    },
  };
}
