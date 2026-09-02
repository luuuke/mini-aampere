import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { UserRole } from '../generated/prisma/enums.js';
import { AuctionsService } from './auctions.service.js';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Get()
  @Roles(UserRole.DEALER)
  list() {
    return this.auctionsService.listDealerAuctions();
  }

  @Get(':auctionId')
  @Roles(UserRole.DEALER)
  @Header('Cache-Control', 'private, no-store')
  getDetail(
    @Param('auctionId', new ParseUUIDPipe()) auctionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.auctionsService.getDealerAuctionDetail(auctionId, req.user.id);
  }
}
