import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP_WITH_TIMEZONE_PATTERN = /(?:Z|[+-]\d{2}:\d{2})$/;
const POSTGRES_INTEGER_MAX = 2_147_483_647;

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeVin({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class CreateVehicleDto {
  @Transform(normalizeVin)
  @IsString()
  @Length(17, 17)
  @Matches(VIN_PATTERN)
  vin: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  make: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  model: string;

  @IsInt()
  @Min(1886)
  @Max(new Date().getUTCFullYear() + 1)
  year: number;

  @IsInt()
  @Min(0)
  @Max(POSTGRES_INTEGER_MAX)
  mileageKm: number;

  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999.99)
  batteryCapacityKwh: number;

  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  batteryHealthPercent: number;

  @IsInt()
  @Min(0)
  @Max(POSTGRES_INTEGER_MAX)
  rangeKm: number;

  @Transform(trimString)
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(DATE_ONLY_PATTERN)
  registrationDate: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(trimString)
  @IsString()
  conditionNotes?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { each: true },
  )
  photoUrls?: string[];

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  city: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  country: string;
}

export class CreateAuctionDto {
  @Transform(trimString)
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(TIMESTAMP_WITH_TIMEZONE_PATTERN)
  startsAt: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(trimString)
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(TIMESTAMP_WITH_TIMEZONE_PATTERN)
  endsAt?: string;

  @IsInt()
  @Min(1)
  @Max(POSTGRES_INTEGER_MAX)
  startingPrice: number;

  @IsInt()
  @Min(0)
  @Max(POSTGRES_INTEGER_MAX)
  reservePrice: number;

  @IsInt()
  @Min(1)
  @Max(POSTGRES_INTEGER_MAX)
  minIncrement: number;
}

export class CreateVehicleAuctionDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateVehicleDto)
  vehicle: CreateVehicleDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => CreateAuctionDto)
  auction: CreateAuctionDto;
}
