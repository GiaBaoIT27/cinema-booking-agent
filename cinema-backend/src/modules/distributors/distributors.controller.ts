import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DistributorsService } from './distributors.service.js';
import { GetDistributorsQueryDto } from './dto/query-distributor.dto.js';
import { CreateDistributorDto } from './dto/create-distributor.dto.js';
import { UpdateDistributorDto } from './dto/update-distributor.dto.js';
import { UpdateDistributorStatusDto } from './dto/update-status.dto.js';
import { GetDistributorMoviesQueryDto } from './dto/distributor-movies-query.dto.js';

import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';

@Controller('/distributors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DistributorsController {
  constructor(private readonly distributorsService: DistributorsService) {}

  // 1. Get /api/v1/distributors
  @Get()
  @RequirePermissions('distributor:view')
  findAll(@Query() query: GetDistributorsQueryDto) {
    return this.distributorsService.findAll(query);
  }

  //2. POST /api/v1/distributors
  @Post()
  @RequirePermissions('distributor:create')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateDistributorDto) {
    return this.distributorsService.create(createDto);
  }

  // //3. GET /api/v1/distributors
  // @Get(':id')
  // @RequirePermissions('distributor:view')
  // findOne(@Param('id', ParseIntPipe) id: number) {
  //   return this.distributorsService.findOne(id);
  // }

  // 4. PUT /api/v1/distributors/:id
  @Put(':id')
  @RequirePermissions('distributor:update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDistributorDto,
  ) {
    return this.distributorsService.update(id, updateDto);
  }

  // 5. PATCH /api/v1/distributors/:id/status
  @Patch(':id/status')
  @RequirePermissions('distributor:update')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateDistributorStatusDto,
  ) {
    return this.distributorsService.updateStatus(id, updateStatusDto);
  }

  @Get(':id/movies')
  // @RequirePermissions('movie:view')
  getDistributorMovies(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: GetDistributorMoviesQueryDto,
  ) {
    return this.distributorsService.getDistributorMovies(id, query);
  }
}
