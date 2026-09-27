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
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PriceRuleService } from '../services/price-rule.service.js';
import { GetPriceRulesQueryDto } from '../dto/get-price-rules-query.dto.js';
import { PriceRuleListItemResponseDto } from '../dto/price-rule-list-response.dto.js';
import { PriceRuleDetailResponseDto } from '../dto/price-rule-detail-response.dto.js';
import { CreatePriceRuleDto } from '../dto/create-price-rule.dto.js';
import { PriceRuleCreatedResponseDto } from '../dto/create-price-rule-response.dto.js';
import { UpdatePriceRuleDto } from '../dto/update-price-rule.dto.js';

import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';
import { ApiSuccessMessage } from '#src/common/decorators/api-message.decorator.js';

@Controller('/price-rules')
export class PriceRuleController {
  constructor(private readonly priceRuleService: PriceRuleService) {}

  // 1. GET api/v1/price-rules - Lấy danh sách quy tắc giá
  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('price_rule:view')
  @ApiSuccessMessage('Lấy danh sách quy tắc giá thành công')
  async findAll(@Query() queryDto: GetPriceRulesQueryDto) {
    const { data, totalElements } =
      await this.priceRuleService.findAll(queryDto);

    // Transform Entity sang DTO phẳng chuẩn Response Schema
    const dtos = plainToInstance(PriceRuleListItemResponseDto, data, {
      excludeExtraneousValues: true,
    });

    const totalPages = Math.ceil(totalElements / queryDto.limit) || 0;

    return {
      data: dtos,
      pagination: {
        page: queryDto.page ?? 1,
        limit: queryDto.limit ?? 20,
        totalElements,
        totalPages,
      },
    };
  }

  // 2. GET api/v1/price-rules/:id - Xem chi tiết 1 quy tắc giá
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('price_rule:view')
  @ApiSuccessMessage('Lấy chi tiết quy tắc giá thành công')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PriceRuleDetailResponseDto> {
    const priceRule = await this.priceRuleService.findOne(id);

    // Transform Entity sang DTO phẳng chuẩn Response Schema (derive cineplexName từ relation)
    return plainToInstance(
      PriceRuleDetailResponseDto,
      {
        ...priceRule,
        cineplexName:
          priceRule.cineplex?.name ?? 'Tất cả cụm rạp (Toàn hệ thống)',
      },
      { excludeExtraneousValues: true },
    );
  }

  // 3. POST api/v1/price-rules - Tạo mới quy tắc giá
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('price_rule:create')
  @ApiSuccessMessage('Tạo mới quy tắc giá thành công')
  async create(
    @Body() createDto: CreatePriceRuleDto,
  ): Promise<PriceRuleCreatedResponseDto> {
    const createdRule = await this.priceRuleService.create(createDto);

    return plainToInstance(PriceRuleCreatedResponseDto, createdRule, {
      excludeExtraneousValues: true,
    });
  }

  // 4. PUT api/v1/price-rules/:id - Cập nhật quy tắc giá
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('price_rule:update')
  @ApiSuccessMessage('Cập nhật quy tắc giá thành công')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePriceRuleDto,
  ): Promise<PriceRuleCreatedResponseDto> {
    const updatedRule = await this.priceRuleService.update(id, updateDto);

    return plainToInstance(PriceRuleCreatedResponseDto, updatedRule, {
      excludeExtraneousValues: true,
    });
  }
}
