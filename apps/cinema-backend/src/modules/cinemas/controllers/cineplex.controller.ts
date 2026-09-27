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
import { CineplexService } from '../services/cineplex.service.js';

import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { Public } from '#src/common/decorators/public.decorator.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';

import { GetCineplexesQueryDto } from '../dto/cineplexes/query-cineplexes.dto.js';
import { CreateCineplexDto } from '../dto/cineplexes/create-cineplex.dto.js';
import { UpdateCineplexDto } from '../dto/cineplexes/update-cineplex.dto.js';
import { UpdateCineplexStatusDto } from '../dto/cineplexes/update-cineplex-status.dto.js';
import { GetCineplexShowtimesQueryDto } from '../dto/cineplexes/query-cineplex-showtimes.dto.js';
import { GetAuditoriumsQueryDto } from '../dto/cineplexes/query-cinesplex-auditoriums.dto.js';
import { GetFnbItemsQueryDto } from '../dto/cineplexes/query-cineplexe-fnb-items.dto.js';

@Controller('/cineplexes')
export class CineplexController {
  constructor(private readonly cineplexService: CineplexService) {}

  // 1. GET api/v1/cineplexes
  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  getCineplexes(@Query() queryDto: GetCineplexesQueryDto) {
    return this.cineplexService.findAll(queryDto);
  }

  // 2. GET api/v1/cineplexes/:id
  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  getCineplexById(@Param('id', ParseIntPipe) id: number) {
    return this.cineplexService.findOne(id);
  }

  // 3. POST api/v1/cineplexes
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cinema:manage')
  @HttpCode(HttpStatus.CREATED)
  createCineplex(@Body() createDto: CreateCineplexDto) {
    return this.cineplexService.create(createDto);
  }

  // 4. PUT api/v1/cineplexes/:id
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cinema:manage')
  updateCineplex(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCineplexDto,
  ) {
    return this.cineplexService.update(id, updateDto);
  }

  // 5. PATCH api/v1/cineplexes/:id
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cinema:manage')
  @HttpCode(HttpStatus.OK)
  updateCineplexStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateCineplexStatusDto,
  ) {
    return this.cineplexService.updateStatus(id, updateStatusDto);
  }

  // 6. GET api/v1/cineplexes/:id/auditoriums
  @Get(':id/auditoriums')
  @HttpCode(HttpStatus.OK)
  getAuditoriumsByCineplexId(
    @Param('id', ParseIntPipe) id: number,
    @Query() queryDto: GetAuditoriumsQueryDto,
  ) {
    return this.cineplexService.findAuditoriumsByCineplexId(id, queryDto);
  }

  // 7. GET api/v1/cineplexes/:id/showtimes
  @Get(':id/showtimes')
  @HttpCode(HttpStatus.OK)
  getShowtimesByCineplexId(
    @Param('id', ParseIntPipe) id: number,
    @Query() queryDto: GetCineplexShowtimesQueryDto,
  ) {
    return this.cineplexService.findShowtimesByCineplexId(id, queryDto);
  }

  @Get(':id/fnb-items')
  @HttpCode(HttpStatus.OK)
  async getFnbItemsByCineplexId(
    @Param('id', ParseIntPipe) id: number,
    @Query() queryDto: GetFnbItemsQueryDto,
  ) {
    return this.cineplexService.findFnbItemsByCineplexId(id, queryDto);
  }
}
