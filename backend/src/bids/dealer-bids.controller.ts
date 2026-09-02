import { Controller, Get, Req } from '@nestjs/common';
import { BidsService } from './bids.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../generated/prisma/enums.js';
import { AuthenticatedUser } from '../auth/auth.types.js';
import type { Request } from 'express';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('bids')
export class DealerBidsController {
  constructor(private readonly bidsService: BidsService) {}

  @Get()
  @Roles(UserRole.DEALER)
  getBids(@Req() req: AuthenticatedRequest) {
    return this.bidsService.listDealerBids(req.user.id);
  }
}
