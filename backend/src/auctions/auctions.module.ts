import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuctionsController } from './auctions.controller.js';
import { AuctionsService } from './auctions.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [AuctionsController],
  providers: [AuctionsService],
})
export class AuctionsModule {}
