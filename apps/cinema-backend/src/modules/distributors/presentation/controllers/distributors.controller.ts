import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';
import { DistributorsService } from '../../application/services/distributors.service.js';
import { DistributorMoviesService } from '../../application/services/distributor-movies.service.js';
import { GetDistributorsQueryDto } from '../../application/dto/query-distributors.dto.js';
import { CreateDistributorDto } from '../../application/dto/create-distributor.dto.js';
import { UpdateDistributorDto } from '../../application/dto/update-distributor.dto.js';
import { UpdateDistributorStatusDto } from '../../application/dto/update-distributor-status.dto.js';
import { GetDistributorMoviesQueryDto } from '../../application/dto/query-distributor-movies.dto.js';

@Controller('/distributors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DistributorsController {
  constructor(
    private readonly distributorsService: DistributorsService,
    private readonly distributorMoviesService: DistributorMoviesService,
  ) {}

  // 1. GET api/v1/distributors
  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('distributor:view')
  findAll(@Query() query: GetDistributorsQueryDto) {
    return this.distributorsService.findAll(query);
  }

  // 2. POST api/v1/distributors
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('distributor:create')
  create(@Body() dto: CreateDistributorDto) {
    return this.distributorsService.create(dto);
  }

  // 3. GET api/v1/distributors/:id
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('distributor:view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.distributorsService.findOne(id);
  }

  // 4. PUT api/v1/distributors/:id
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('distributor:update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDistributorDto,
  ) {
    return this.distributorsService.update(id, dto);
  }

  // 5. PATCH api/v1/distributors/:id/status
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('distributor:update')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDistributorStatusDto,
  ) {
    return this.distributorsService.updateStatus(id, dto);
  }

  // 6. GET api/v1/distributors/:id/movies
  @Get(':id/movies')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('movie:view')
  getDistributorMovies(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: GetDistributorMoviesQueryDto,
  ) {
    return this.distributorMoviesService.findMovies(id, query);
  }
}
