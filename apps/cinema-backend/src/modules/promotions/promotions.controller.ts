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
  Patch,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service.js';
import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { Public } from '#src/common/decorators/public.decorator.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';
import { GetPromotionsQueryDto } from './dto/query-promotions.dto.js';
import { GetPublicPromotionsQueryDto } from './dto/query-promotions-public.dto.js';
import { CreatePromotionDto } from './dto/create-promotion.dto.js';
import { UpdatePromotionDto } from './dto/update-promotion.dto.js';
import { UpdatePromotionStatusDto } from './dto/update-promotion-status.dto.js';
import { ValidatePromotionDto } from './dto/validate-promotion.dto.js';

@Controller('/promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  // 2. GET /api/v1/promotions/public
  @Get('public')
  @HttpCode(HttpStatus.OK)
  @Public()
  findPublicActive(@Query() query: GetPublicPromotionsQueryDto) {
    return this.promotionsService.findPublicActive(query);
  }

  // 1. GET /api/v1/promotions
  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('promo:view')
  findAllForAdmin(@Query() query: GetPromotionsQueryDto) {
    return this.promotionsService.findAllForAdmin(query);
  }

  // 3. GET /api/v1/promotions/:id
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @Public()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.findOne(id);
  }

  // 4. POST /api/v1/promotions
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('promo:create')
  create(@Body() createDto: CreatePromotionDto) {
    return this.promotionsService.create(createDto);
  }
  // 5. PUT /api/v1/promotions/:id
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('promo:update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePromotionDto,
  ) {
    return this.promotionsService.update(id, updateDto);
  }

  // 6. PATCH /api/v1/promotions/:id/status
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('promo:update')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdatePromotionStatusDto,
  ) {
    return this.promotionsService.updateStatus(id, updateStatusDto);
  }

  // 7. POST /api/v1/promotions/validate
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('promo:apply')
  validateAndCalculate(@Body() validateDto: ValidatePromotionDto) {
    return this.promotionsService.validateAndCalculate(validateDto);
  }
  // 8. GET /api/v1/promotions/:id/usage
  //   @Get(':id/usage')
  //   //   @RequirePermissions('report:global')
  //   getUsageStats(@Param('id', ParseIntPipe) id: number) {
  //     return this.promotionsService.getUsageStats(id);
  //   }
}
