import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateWardDto } from './dto/create-ward.dto.js';
import { FilterWardDto } from './dto/filter-ward.dto.js';
import { WardsService } from './wards.service.js';

@Controller('wards')
export class WardsController {
  constructor(private readonly wardsService: WardsService) {}

  @Get()
  findAll(@Query() filterDto: FilterWardDto) {
    return this.wardsService.findAll(filterDto);
  }

  @Post()
  create(@Body() createDto: CreateWardDto) {
    return this.wardsService.create(createDto);
  }
}
