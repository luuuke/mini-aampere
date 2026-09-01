import { Controller, Get } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../generated/prisma/enums.js';
import { AuctionsService } from './auctions.service.js';

@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Get()
  @Roles(UserRole.DEALER)
  list() {
    return this.auctionsService.listDealerAuctions();
  }
}
