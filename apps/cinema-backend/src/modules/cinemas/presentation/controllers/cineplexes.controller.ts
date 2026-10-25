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
} from '@nestjs/common';

import { CineplexesService } from '../../application/services/cineplexes.service.js';
import { QueryCineplexesDto } from '../../application/dto/cineplexes/query-cineplexes.dto.js';
import { CreateCineplexDto } from '../../application/dto/cineplexes/create-cineplex.dto.js';
import { UpdateCineplexDto } from '../../application/dto/cineplexes/update-cineplex.dto.js';
import { UpdateCineplexStatusDto } from '../../application/dto/cineplexes/update-cineplex-status.dto.js';
import { QueryCineplexAuditoriumsDto } from '../../application/dto/cineplexes/query-cineplex-auditoriums.dto.js';
import { QueryCineplexFnbItemsDto } from '../../application/dto/cineplexes/query-cineplex-fnb-items.dto.js';

import { Public } from '#src/common/decorators/public.decorator.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';

@Controller('/cineplexes')
export class CineplexesController {
  constructor(private readonly cineplexesService: CineplexesService) {}

  // 1. GET /api/v1/cineplexes
  @Get()
  @HttpCode(HttpStatus.OK)
  @Public()
  findAll(@Query() query: QueryCineplexesDto) {
    return this.cineplexesService.findAll(query);
  }

  // 2. GET /api/v1/cineplexes/{id}
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @Public()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cineplexesService.findOne(String(id));
  }

  // 3. POST /api/v1/cineplexes
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('cinema:manage')
  create(@Body() dto: CreateCineplexDto) {
    return this.cineplexesService.create(dto);
  }

  // 4. PUT /api/v1/cineplexes/{id}
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('cinema:manage')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCineplexDto,
  ) {
    return this.cineplexesService.update(String(id), dto);
  }

  // 5. PATCH /api/v1/cineplexes/{id}/status
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('cinema:manage')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCineplexStatusDto,
  ) {
    return this.cineplexesService.updateStatus(String(id), dto);
  }

  // 6. GET /api/v1/cineplexes/{id}/auditoriums
  @Get(':id/auditoriums')
  @HttpCode(HttpStatus.OK)
  findAuditoriums(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryCineplexAuditoriumsDto,
  ) {
    return this.cineplexesService.findAuditoriums(String(id), query);
  }

  // 7. GET /api/v1/cineplexes/{id}/fnb-items
  @Get(':id/fnb-items')
  @HttpCode(HttpStatus.OK)
  @Public()
  findFnbItems(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryCineplexFnbItemsDto,
  ) {
    return this.cineplexesService.findFnbItems(String(id), query);
  }
}
