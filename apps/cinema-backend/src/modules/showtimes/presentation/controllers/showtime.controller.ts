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
  Patch,
} from '@nestjs/common';

import { ShowtimeService } from '../../application/services/showtime.service.js';
import { PriceCalculationService } from '../../application/services/price-calculation.service.js';

import { GetShowtimesQueryDto } from '../../application/dto/get-showtimes-query.dto.js';
import { CreateShowtimeDto } from '../../application/dto/create-showtime.dto.js';
import { UpdateShowtimeDto } from '../../application/dto/update-showtime.dto.js';
import { UpdateShowtimeStatusDto } from '../../application/dto/update-showtime-status.dto.js';
import { OverrideSeatPriceDto } from '../../application/dto/override-seat-price.dto.js';
import { BatchOverrideSeatPricesDto } from '../../application/dto/batch-override-seat-prices.dto.js';

import { ApiSuccessMessage } from '#src/common/decorators/api-message.decorator.js';
import { Public } from '#src/common/decorators/public.decorator.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';

@Controller('/showtimes')
export class ShowtimeController {
  constructor(
    private readonly showtimeService: ShowtimeService,
    private readonly priceCalculationService: PriceCalculationService,
  ) {}

  // 1. GET api/v1/showtimes - Lọc & Tìm kiếm danh sách lịch chiếu
  @Get()
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiSuccessMessage('Lấy danh sách lịch chiếu thành công')
  async findAll(@Query() queryDto: GetShowtimesQueryDto) {
    const { data, totalItems } = await this.showtimeService.findAll(queryDto);

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

  // 2. POST api/v1/showtimes - Khởi tạo suất chiếu mới
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('showtime:create')
  @ApiSuccessMessage('Khởi tạo suất chiếu mới thành công')
  async create(@Body() createDto: CreateShowtimeDto) {
    return this.showtimeService.create(createDto);
  }

  // 3. GET api/v1/showtimes/:id - Xem chi tiết 1 suất chiếu
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiSuccessMessage('Lấy thông tin chi tiết suất chiếu thành công')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.showtimeService.findOne(id);
  }
  // 4. PUT api/v1/showtimes/:id - Cập nhật thông tin suất chiếu
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('showtime:update')
  @ApiSuccessMessage('Cập nhật thông tin suất chiếu thành công')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateShowtimeDto,
  ) {
    return this.showtimeService.update(id, updateDto);
  }

  // 5. PATCH api/v1/showtimes/:id/status - Cập nhật trạng thái vòng đời suất chiếu
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('showtime:update')
  @ApiSuccessMessage('Cập nhật trạng thái suất chiếu thành công')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateShowtimeStatusDto,
  ) {
    return this.showtimeService.updateStatus(id, updateStatusDto);
  }

  // 6. GET api/v1/showtimes/:id/seats - Sub-resource: Lấy ma trận ghế & Trạng thái realtime
  @Get(':id/seats')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiSuccessMessage('Lấy sơ đồ ghế và trạng thái suất chiếu thành công')
  async getSeats(@Param('id', ParseIntPipe) id: number) {
    return this.showtimeService.getSeatMatrix(id);
  }

  // 7. GET api/v1/showtimes/:id/seat-prices - Tra cứu Snapshot giá vé
  @Get(':id/seat-prices')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiSuccessMessage('Lấy thông tin giá vé suất chiếu thành công')
  async getSeatPrices(@Param('id', ParseIntPipe) id: number) {
    return this.priceCalculationService.getSeatPrices(id);
  }

  // 8. POST api/v1/showtimes/:id/seat-prices/generate - Sinh Snapshot giá vé tự động
  @Post(':id/seat-prices/generate')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('seat_price:generate')
  @ApiSuccessMessage('Tự động sinh ma trận giá vé suất chiếu thành công')
  async generateSeatPrices(
    @Param('id', ParseIntPipe) id: number,
    @Query('keyword') keyword?: string,
  ) {
    const isForce = keyword === 'true';
    return await this.priceCalculationService.generateSeatPrices(id, isForce);
  }

  // 9. PATCH api/v1/showtimes/:id/seat-prices/:seatTypeId - Ghi đè giá vé 1 loại ghế
  @Patch(':id/seat-prices/:seatTypeId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('seat_price:override')
  @ApiSuccessMessage('Ghi đè giá vé loại ghế thành công')
  async overrideSeatPrice(
    @Param('id', ParseIntPipe) id: number,
    @Param('seatTypeId', ParseIntPipe) seatTypeId: number,
    @Body() overrideDto: OverrideSeatPriceDto,
  ) {
    return await this.priceCalculationService.overrideSeatPrice(
      id,
      seatTypeId,
      overrideDto,
    );
  }

  // 10. PUT api/v1/showtimes/:id/seat-prices - Điều chỉnh giá vé hàng loạt
  @Put(':id/seat-prices')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('seat_price:override')
  @ApiSuccessMessage('Cập nhật hàng loạt giá vé suất chiếu thành công')
  async batchOverrideSeatPrices(
    @Param('id', ParseIntPipe) id: number,
    @Body() batchDto: BatchOverrideSeatPricesDto,
  ) {
    return await this.priceCalculationService.batchOverrideSeatPrices(
      id,
      batchDto,
    );
  }
}
