import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { ProvincesService } from '../../application/services/provinces.service.js';
import { QueryProvincesDto } from '../../application/dto/query-province.dto.js';
import { CreateProvinceDto } from '../../application/dto/create-province.dto.js';
import { QueryProvinceWardsDto } from '../../application/dto/query-province-wards.dto.js';

import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { Public } from '#src/common/decorators/public.decorator.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';

@Controller('/provinces')
export class ProvincesController {
  constructor(private readonly provincesService: ProvincesService) {}

  // 1. GET /api/v1/provinces
  @Get()
  @HttpCode(HttpStatus.OK)
  @Public()
  findAll(@Query() query: QueryProvincesDto) {
    return this.provincesService.findAll(query);
  }

  // 2. POST /api/v1/provinces
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('province:create')
  create(@Body() dto: CreateProvinceDto) {
    return this.provincesService.create(dto);
  }

  // 3. GET /api/v1/provinces/{province_id}/wards
  @Get(':province_id/wards')
  @HttpCode(HttpStatus.OK)
  @Public()
  getProvinceWards(
    @Param('province_id', ParseIntPipe) provinceId: number,
    @Query() query: QueryProvinceWardsDto,
  ) {
    return this.provincesService.getProvinceWards(String(provinceId), query);
  }
}
