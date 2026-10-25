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
} from '@nestjs/common';
import { PriceRuleService } from '../../application/services/price-rule.service.js';
import { GetPriceRulesQueryDto } from '../../application/dto/get-price-rules-query.dto.js';
import { CreatePriceRuleDto } from '../../application/dto/create-price-rule.dto.js';
import { UpdatePriceRuleDto } from '../../application/dto/update-price-rule.dto.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';
import { ApiSuccessMessage } from '#src/common/decorators/api-message.decorator.js';

@Controller('/price-rules')
export class PriceRuleController {
  constructor(private readonly priceRuleService: PriceRuleService) {}

  // 1. GET api/v1/price-rules - Lấy danh sách quy tắc giá
  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('price_rule:view')
  @ApiSuccessMessage('Lấy danh sách quy tắc giá thành công')
  async findAll(@Query() queryDto: GetPriceRulesQueryDto) {
    const { data, totalItems } = await this.priceRuleService.findAll(queryDto);
    return {
      data,
      pagination: {
        page: queryDto.page ?? 1,
        limit: queryDto.limit ?? 20,
        totalItems,
        totalPages: Math.ceil(totalItems / queryDto.limit) || 0,
      },
    };
  }

  // 2. GET api/v1/price-rules/:id - Xem chi tiết 1 quy tắc giá
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('price_rule:view')
  @ApiSuccessMessage('Lấy chi tiết quy tắc giá thành công')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.priceRuleService.findOne(id);
  }

  // 3. POST api/v1/price-rules - Tạo mới quy tắc giá
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('price_rule:create')
  @ApiSuccessMessage('Tạo mới quy tắc giá thành công')
  async create(@Body() createDto: CreatePriceRuleDto) {
    return this.priceRuleService.create(createDto);
  }

  // 4. PUT api/v1/price-rules/:id - Cập nhật quy tắc giá
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('price_rule:update')
  @ApiSuccessMessage('Cập nhật quy tắc giá thành công')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePriceRuleDto,
  ) {
    return this.priceRuleService.update(id, updateDto);
  }
}
