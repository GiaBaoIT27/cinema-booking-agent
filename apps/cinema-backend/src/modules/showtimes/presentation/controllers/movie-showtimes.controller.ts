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
import { MovieShowtimesService } from '../../application/services/movie-showtimes.service.js';
import { GetMovieShowtimesQueryDto } from '../../application/dto/get-movie-showtimes-query.dto.js';

/**
 * Route giữ nguyên contract HTTP cũ (trước đây nằm trong MoviesController
 * của module movies). Prefix 'movies' trùng với MoviesController
 * nhưng KHÔNG có route trùng exact → không xung đột.
 */
@Controller('movies')
export class MovieShowtimesController {
  constructor(private readonly movieShowtimesService: MovieShowtimesService) {}

  // GET api/v1/movies/:id/showtimes
  @Get(':id/showtimes')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiSuccessMessage('Lấy danh sách lịch chiếu của phim thành công')
  getMovieShowtimes(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: GetMovieShowtimesQueryDto,
  ) {
    return this.movieShowtimesService.findByMovieId(id, query);
  }
}
