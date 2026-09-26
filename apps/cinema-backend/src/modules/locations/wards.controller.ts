import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { CreateWardDto } from './dto/create-ward.dto.js';
import { GetWardsQueryDto } from './dto/query-wards.dto.js';
import { WardsService } from './wards.service.js';

import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { Public } from '#src/common/decorators/public.decorator.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';

@Controller('wards')
export class WardsController {
  constructor(private readonly wardsService: WardsService) {}

  // 1. GET api/v1/wards
  @Get()
  @HttpCode(HttpStatus.OK)
  @Public()
  findAll(@Query() query: GetWardsQueryDto) {
    return this.wardsService.findAll(query);
  }

  // 2. POST api/v1/wards
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('ward:create')
  create(@Body() createDto: CreateWardDto) {
    return this.wardsService.create(createDto);
  }
}
