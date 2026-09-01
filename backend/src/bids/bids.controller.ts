import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { BidsService } from './bids.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../generated/prisma/enums.js';
import { PlaceBidDto } from './dto/place-bid.dto.js';
import { AuthenticatedUser } from '../auth/auth.types.js';
import type { Request } from 'express';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('auctions/:auctionId/bids')
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  @Post()
  @Roles(UserRole.DEALER)
  placeBid(
    @Param('auctionId', new ParseUUIDPipe()) auctionId: string,
    @Body() placeBidDto: PlaceBidDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bidsService.placeBid({
      auctionId,
      dealerId: req.user.id,
      amount: placeBidDto.amount,
    });
  }
}
