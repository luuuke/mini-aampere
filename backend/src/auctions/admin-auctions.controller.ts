import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../generated/prisma/enums.js';
import { AuctionsService } from './auctions.service.js';
import { ConfirmAuctionResultDto } from './dto/confirm-auction-result.dto.js';
import { CreateVehicleAuctionDto } from './dto/create-vehicle-auction.dto.js';

@Controller('admin/auctions')
@Roles(UserRole.ADMIN)
export class AdminAuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Post()
  create(@Body() createVehicleAuctionDto: CreateVehicleAuctionDto) {
    return this.auctionsService.create(createVehicleAuctionDto);
  }

  @Patch(':auctionId/result')
  confirmResult(
    @Param('auctionId', new ParseUUIDPipe()) auctionId: string,
    @Body() confirmAuctionResultDto: ConfirmAuctionResultDto,
  ) {
    return this.auctionsService.confirmResult({
      auctionId,
      result: confirmAuctionResultDto.result,
    });
  }
}
