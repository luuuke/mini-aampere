import { IsEnum } from 'class-validator';
import { AuctionResult } from '../../generated/prisma/enums.js';

export class ConfirmAuctionResultDto {
  @IsEnum(AuctionResult)
  result: AuctionResult;
}
