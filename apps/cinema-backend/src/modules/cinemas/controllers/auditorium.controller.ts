import {
  Controller,
  Get,
  Post,
  Put,
  HttpStatus,
  HttpCode,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { AuditoriumService } from '../services/auditorium.service.js';
import { GetAuditoriumsQueryDto } from '../dto/auditoriums/query-auditoriums.dto.js';
import { CreateAuditoriumDto } from '../dto/auditoriums/create-auditorium.dto.js';
import { UpdateAuditoriumDto } from '../dto/auditoriums/update-auditorium.dto.js';
import { UpdateAuditoriumStatusDto } from '../dto/auditoriums/update-auditorium-status.dto.js';
import { CreateSeatLayoutDto } from '../dto/auditoriums/create-seat-layout.dto.js';

import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { Public } from '#src/common/decorators/public.decorator.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';

@Controller('/auditoriums')
export class AuditoriumController {
  constructor(private readonly auditoriumService: AuditoriumService) {}

  // 1. GET api/v1/auditoriums
  @Get()
  @HttpCode(HttpStatus.OK)
  getAuditoriums(@Query() query: GetAuditoriumsQueryDto) {
    return this.auditoriumService.findAll(query);
  }

  // 2. GET api/v1/auditoriums/:id
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @Public()
  getAuditoriumById(@Param('id', ParseIntPipe) id: number) {
    return this.auditoriumService.findOne(id);
  }

  // 3. POST api/v1/auditoriums
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('auditorium:create')
  create(@Body() dto: CreateAuditoriumDto) {
    return this.auditoriumService.create(dto);
  }

  // 4. PUT api/v1/auditoriums/:id
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('auditorium:update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAuditoriumDto,
  ) {
    return this.auditoriumService.update(id, dto);
  }

  // 5. PATCH api/v1/auditoriums/:id/status
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('auditorium:update')
  updateAuditoriumStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAuditoriumStatusDto,
  ) {
    return this.auditoriumService.updateStatus(id, dto);
  }

  // 6. GET api/v1/auditoriums/:id/seats
  @Get(':id/seats')
  @HttpCode(HttpStatus.OK)
  @Public()
  getAuditoriumSeats(@Param('id', ParseIntPipe) id: number) {
    return this.auditoriumService.getSeatLayout(id);
  }

  // 7. POST api/v1/auditoriums/:id/seats/batch
  @Post(':id/seats/batch')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('auditorium:update')
  createSeatLayout(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSeatLayoutDto,
  ) {
    return this.auditoriumService.configureSeatLayout(id, dto);
  }
}
