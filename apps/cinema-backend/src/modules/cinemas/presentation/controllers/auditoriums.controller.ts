import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  HttpStatus,
  HttpCode,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AuditoriumsService } from '../../application/services/auditoriums.service.js';
import { QueryAuditoriumsDto } from '../../application/dto/auditoriums/query-auditoriums.dto.js';
import { CreateAuditoriumDto } from '../../application/dto/auditoriums/create-auditorium.dto.js';
import { UpdateAuditoriumDto } from '../../application/dto/auditoriums/update-auditorium.dto.js';
import { UpdateAuditoriumStatusDto } from '../../application/dto/auditoriums/update-auditorium-status.dto.js';
import { CreateSeatLayoutDto } from '../../application/dto/auditoriums/create-seat-layout.dto.js';

import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { Public } from '#src/common/decorators/public.decorator.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';

@Controller('/auditoriums')
export class AuditoriumsController {
  constructor(private readonly auditoriumsService: AuditoriumsService) {}

  // 1. GET /api/v1/auditoriums
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(@Query() query: QueryAuditoriumsDto) {
    return this.auditoriumsService.findAll(query);
  }

  // 2. GET /api/v1/auditoriums/{id}
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @Public()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.auditoriumsService.findOne(String(id));
  }

  // 3. POST /api/v1/auditoriums
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('auditorium:create')
  create(@Body() dto: CreateAuditoriumDto) {
    return this.auditoriumsService.create(dto);
  }

  // 4. PUT /api/v1/auditoriums/{id}
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('auditorium:update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAuditoriumDto,
  ) {
    return this.auditoriumsService.update(String(id), dto);
  }

  // 5. PATCH /api/v1/auditoriums/{id}/status
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('auditorium:update')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAuditoriumStatusDto,
  ) {
    return this.auditoriumsService.updateStatus(String(id), dto);
  }

  // 6. GET /api/v1/auditoriums/{id}/seats
  @Get(':id/seats')
  @HttpCode(HttpStatus.OK)
  @Public()
  getSeatLayout(@Param('id', ParseIntPipe) id: number) {
    return this.auditoriumsService.getSeatLayout(String(id));
  }

  // 7. POST /api/v1/auditoriums/{id}/seats/batch
  @Post(':id/seats/batch')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('auditorium:update')
  configureSeatLayout(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSeatLayoutDto,
  ) {
    return this.auditoriumsService.configureSeatLayout(String(id), dto);
  }
}
