import {
  Controller,
  Get,
  Put,
  HttpStatus,
  HttpCode,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';

import { SeatsService } from '../../application/services/seats.service.js';
import { UpdateSeatDto } from '../../application/dto/seats/update-seat.dto.js';

import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';

@Controller('/seats')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  // 1. GET /api/v1/seats/{id}
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cinema:manage')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.seatsService.findOne(String(id));
  }

  // 2. PUT /api/v1/seats/{id}
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cinema:manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSeatDto) {
    return this.seatsService.update(String(id), dto);
  }
}
