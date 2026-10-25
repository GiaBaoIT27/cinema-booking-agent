import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';

import { Public } from '#src/common/decorators/public.decorator.js';
import { ApiSuccessMessage } from '#src/common/decorators/api-message.decorator.js';
import { CineplexShowtimesService } from '../../application/services/cineplex-showtimes.service.js';
import { QueryCineplexShowtimesDto } from '../../application/dto/query-cineplex-showtimes.dto.js';

/**
 * Route giữ nguyên contract HTTP cũ (trước đây nằm trong CineplexesController
 * của module cinemas). Prefix 'cineplexes' trùng với CineplexesController
 * nhưng KHÔNG có route trùng exact → không xung đột.
 */
@Controller('cineplexes')
export class CineplexShowtimesController {
  constructor(
    private readonly cineplexShowtimesService: CineplexShowtimesService,
  ) {}

  // GET /api/v1/cineplexes/{id}/showtimes
  @Get(':id/showtimes')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiSuccessMessage('Lấy danh sách lịch chiếu của cụm rạp thành công')
  findShowtimes(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryCineplexShowtimesDto,
  ) {
    return this.cineplexShowtimesService.findShowtimes(String(id), query);
  }
}
