import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateProvinceDto } from './dto/create-province.dto.js';
import { FilterProvinceDto } from './dto/filter-province.dto.js';
import { FilterWardDto } from './dto/filter-ward.dto.js';
import { ProvincesService } from './provinces.service.js';
import { WardsService } from './wards.service.js';

@Controller('provinces')
export class ProvincesController {
  constructor(
    private readonly provincesService: ProvincesService,
    private readonly wardsService: WardsService,
  ) {}

  @Get()
  findAll(@Query() filterDto: FilterProvinceDto) {
    return this.provincesService.findAll(filterDto);
  }

  @Post()
  create(@Body() createDto: CreateProvinceDto) {
    return this.provincesService.create(createDto);
  }

  @Get(':province_id/wards')
  findWards(
    @Param('province_id') provinceId: string,
    @Query() filterDto: FilterWardDto,
  ) {
    return this.wardsService.findByProvince(provinceId, filterDto);
  }
}
