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
  Delete,
  UseInterceptors,
  ClassSerializerInterceptor,
  UploadedFiles,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { Public } from '#src/common/decorators/public.decorator.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';
import { ApiSuccessMessage } from '#src/common/decorators/api-message.decorator.js';

import { MoviesService } from './movies.service.js';
import { GetMoviesQueryDto } from './dto/get-movies-query.dto.js';
import { MovieListResponseDto } from './dto/movie-list-response.dto.js';
import { MovieDetailResponseDto } from './dto/movie-detail-response.dto.js';
import { CreateMovieDto } from './dto/create-movie.dto.js';
import { CreateMovieResponseDto } from './dto/create-movie-response.dto.js';
import { UpdateMovieDto } from './dto/update-movie.dto.js';
import { UpdateMovieStatusDto } from './dto/update-movie-status.dto.js';
import { UpdateMovieGenresDto } from './dto/update-movie-genres.dto.js';
import { GetMovieShowtimesQueryDto } from './dto/get-movie-showtimes-query.dto.js';
import { MovieShowtimesResponseDto } from './dto/movie-showtimes-response.dto.js';

import type { MovieMediaFiles } from './interfaces/movie-media.interface.js';

@Controller('movies')
@UseInterceptors(ClassSerializerInterceptor)
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  // 1. GET api/v1/movies
  @Get()
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiSuccessMessage('Lấy danh sách phim thành công')
  async findAll(@Query() queryDto: GetMoviesQueryDto) {
    const { data, totalElements } = await this.moviesService.findAll(queryDto);

    // Tự động map mảng Entity thành mảng MovieListResponseDto (loại bỏ trường thừa)
    const dtos = plainToInstance(MovieListResponseDto, data, {
      excludeExtraneousValues: true,
    });

    const totalPages = Math.ceil(totalElements / queryDto.limit) || 0;

    return {
      data: dtos,
      pagination: {
        page: queryDto.page,
        limit: queryDto.limit,
        totalElements,
        totalPages,
      },
    };
  }

  // 2. GET api/v1/movies/:id - Xem chi tiết 1 bộ phim
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiSuccessMessage('Lấy thông tin chi tiết phim thành công')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MovieDetailResponseDto> {
    const movieEntity = await this.moviesService.findOne(id);

    // Tự động chuyển đổi Entity sang Chi tiết DTO (Giữ lại distributor và genres)
    return plainToInstance(MovieDetailResponseDto, movieEntity, {
      excludeExtraneousValues: true,
    });
  }

  // 3. POST api/v1/movies
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('movie:create')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'posterFile', maxCount: 1 },
      { name: 'bannerFile', maxCount: 1 },
      { name: 'trailerFile', maxCount: 1 },
    ]),
  )
  @ApiSuccessMessage('Tạo mới thông tin phim thành công')
  async create(
    @Body() createDto: CreateMovieDto,
    @UploadedFiles() files?: MovieMediaFiles,
  ): Promise<CreateMovieResponseDto> {
    const createdMovie = await this.moviesService.create(createDto, files);

    // Tự động map Entity sang DTO phản hồi thu gọn (id, title, status, createdAt)
    return plainToInstance(CreateMovieResponseDto, createdMovie, {
      excludeExtraneousValues: true,
    });
  }

  // 4. PUT api/v1/movies/:id
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('movie:update')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'posterFile', maxCount: 1 },
      { name: 'bannerFile', maxCount: 1 },
      { name: 'trailerFile', maxCount: 1 },
    ]),
  )
  @ApiSuccessMessage('Cập nhật thông tin phim thành công')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMovieDto,
    @UploadedFiles() files?: MovieMediaFiles,
  ): Promise<MovieDetailResponseDto> {
    const updatedMovie = await this.moviesService.update(id, updateDto, files);

    return plainToInstance(MovieDetailResponseDto, updatedMovie, {
      excludeExtraneousValues: true,
    });
  }

  // 5. PATCH api/v1/movies/:id/status - Cập nhật trạng thái vòng đời phim
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('movie:update')
  @ApiSuccessMessage('Cập nhật trạng thái phim thành công')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateMovieStatusDto,
  ): Promise<MovieDetailResponseDto> {
    const updatedMovie = await this.moviesService.updateStatus(
      id,
      updateStatusDto,
    );

    return plainToInstance(MovieDetailResponseDto, updatedMovie, {
      excludeExtraneousValues: true,
    });
  }

  // 6. PUT api/v1/movies/:id/genres - Cập nhật thể loại của phim
  @Patch(':id/genres')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('movie:update')
  @ApiSuccessMessage('Cập nhật thể loại phim thành công')
  async updateGenres(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGenresDto: UpdateMovieGenresDto,
  ): Promise<MovieDetailResponseDto> {
    const updatedMovie = await this.moviesService.updateGenres(
      id,
      updateGenresDto,
    );

    return plainToInstance(MovieDetailResponseDto, updatedMovie, {
      excludeExtraneousValues: true,
    });
  }

  // 7. DELETE api/v1/movies/:id - Xóa phim
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('movie:delete')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.moviesService.remove(id);
  }

  @Get(':id/showtimes')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiSuccessMessage('Lấy danh sách lịch chiếu của phim thành công')
  async getMovieShowtimes(
    @Param('id', ParseIntPipe) id: number,
    @Query() queryDto: GetMovieShowtimesQueryDto,
  ): Promise<MovieShowtimesResponseDto> {
    const result = await this.moviesService.getMovieShowtimes(id, queryDto);

    return plainToInstance(MovieShowtimesResponseDto, result, {
      excludeExtraneousValues: true,
    });
  }
}
