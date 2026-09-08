import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProvincesService } from './provinces.service.js';
import { GetProvincesQueryDto } from './dto/query-province.dto.js';
import { CreateProvinceDto } from './dto/create-province.dto.js';
import { GetProvinceWardsQueryDto } from './dto/query-province-wards.dto.js';
import { Public } from '#src/common/decorators/public.decorator.js';
import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';

@Controller('provinces')
export class ProvincesController {
  constructor(private readonly provincesService: ProvincesService) {}

  // 1. GET api/v1/provinces
  @Get()
  @Public()
  findAll(@Query() query: GetProvincesQueryDto) {
    return this.provincesService.findAll(query);
  }

  // 2. POST api/v1/provinces
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  // @RequirePermissions('province:create')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateProvinceDto) {
    return this.provincesService.create(createDto);
  }

  // 3. GET api/v1/provinces/:province_id/wards
  @Get(':province_id/wards')
  @Public()
  getProvinceWards(
    @Param('province_id', ParseIntPipe) provinceId: number,
    @Query() query: GetProvinceWardsQueryDto,
  ) {
    return this.provincesService.getProvinceWards(provinceId, query);
  }
}
