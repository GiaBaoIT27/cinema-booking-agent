import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Patch,
  Put,
  Body,
} from '@nestjs/common';
import { SeatsService } from '../services/seat.service.js';
import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { Public } from '#src/common/decorators/public.decorator.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';
import { UpdateSeatDto } from '../dto/seats/update-seat.dto.js';

@Controller('seats')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  // GET /api/v1/seats/{id}
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cinema:manage')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const seatData = await this.seatsService.findOne(id);
    return {
      id: seatData.id,
      auditoriumId: seatData.auditoriumId,
      seatTypeId: seatData.seatTypeId,
      rowLabel: seatData.rowLabel,
      columnNumber: seatData.columnNumber,
      seatNumber: seatData.seatNumber,
      coordX: seatData.coordX,
      coordY: seatData.coordY,
      gridSpan: seatData.gridSpan,
      status: seatData.status,
      createdAt: seatData.createdAt,
      updatedAt: seatData.updatedAt,
    };
  }

  // PUT /api/v1/seats/{id}
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cinema:manage')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSeatDto: UpdateSeatDto,
  ) {
    const updatedSeat = await this.seatsService.update(id, updateSeatDto);
    return {
      id: updatedSeat.id,
      auditoriumId: updatedSeat.auditoriumId,
      seatTypeId: updatedSeat.seatTypeId,
      rowLabel: updatedSeat.rowLabel,
      columnNumber: updatedSeat.columnNumber,
      seatNumber: updatedSeat.seatNumber,
      coordX: updatedSeat.coordX,
      coordY: updatedSeat.coordY,
      gridSpan: updatedSeat.gridSpan,
      status: updatedSeat.status,
      createdAt: updatedSeat.createdAt,
      updatedAt: updatedSeat.updatedAt,
    };
  }

  // PATCH /api/v1/seats/{id}/status

  // DELETE /api/v1/seats/{id}
}
