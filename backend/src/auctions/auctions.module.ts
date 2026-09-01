import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AdminAuctionsController } from './admin-auctions.controller.js';
import { AuctionsController } from './auctions.controller.js';
import { AuctionsService } from './auctions.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [AuctionsController, AdminAuctionsController],
  providers: [AuctionsService],
})
export class AuctionsModule {}
