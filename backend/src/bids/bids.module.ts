import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { BidsController } from './bids.controller.js';
import { BidsService } from './bids.service.js';
import { DealerBidsController } from './dealer-bids.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [BidsController, DealerBidsController],
  providers: [BidsService],
})
export class BidsModule {}
