import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { BidsController } from './bids.controller.js';
import { BidsService } from './bids.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [BidsController],
  providers: [BidsService],
})
export class BidsModule {}
