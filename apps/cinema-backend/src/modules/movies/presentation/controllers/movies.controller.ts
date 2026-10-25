import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { STORAGE_UPLOAD_LIMITS } from '#src/core/storage/public-api/index.js';

import { Public } from '#src/common/decorators/public.decorator.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';
import { ApiSuccessMessage } from '#src/common/decorators/api-message.decorator.js';
import { MoviesService } from '../../application/services/movies.service.js';
import { GetMoviesQueryDto } from '../../application/dto/query-movies.dto.js';
import { CreateMovieDto } from '../../application/dto/create-movie.dto.js';
import { UpdateMovieDto } from '../../application/dto/update-movie.dto.js';
import { UpdateMovieStatusDto } from '../../application/dto/update-movie-status.dto.js';
import { UpdateMovieGenresDto } from '../../application/dto/update-movie-genres.dto.js';
import type { MovieMediaFiles } from '../../application/models/movie-media.model.js';

/**
 * 3 slot media đính kèm khi tạo/sửa phim. Multer buộc phải có giới hạn kích thước file
 * (trước đây không có → upload không giới hạn dung lượng); loại/dung lượng chi tiết từng
 * loại (ảnh 5MB, video 100MB) do StorageService kiểm tra.
 */
const movieMediaInterceptor = () =>
  FileFieldsInterceptor(
    [
      { name: 'posterFile', maxCount: 1 },
      { name: 'bannerFile', maxCount: 1 },
      { name: 'trailerFile', maxCount: 1 },
    ],
    { limits: { fileSize: STORAGE_UPLOAD_LIMITS.VIDEO_MAX_BYTES } },
  );

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  // 1. GET api/v1/movies
  @Get()
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiSuccessMessage('Lấy danh sách phim thành công')
  findAll(@Query() query: GetMoviesQueryDto) {
    return this.moviesService.findAll(query);
  }

  // 2. GET api/v1/movies/:id - Xem chi tiết 1 bộ phim
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiSuccessMessage('Lấy thông tin chi tiết phim thành công')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.moviesService.findOne(id);
  }

  // 3. POST api/v1/movies
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('movie:create')
  @UseInterceptors(movieMediaInterceptor())
  @ApiSuccessMessage('Tạo mới thông tin phim thành công')
  create(
    @Body() dto: CreateMovieDto,
    @UploadedFiles() files?: MovieMediaFiles,
  ) {
    return this.moviesService.create(dto, files);
  }

  // 4. PUT api/v1/movies/:id
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('movie:update')
  @UseInterceptors(movieMediaInterceptor())
  @ApiSuccessMessage('Cập nhật thông tin phim thành công')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMovieDto,
    @UploadedFiles() files?: MovieMediaFiles,
  ) {
    return this.moviesService.update(id, dto, files);
  }

  // 5. PATCH api/v1/movies/:id/status - Cập nhật trạng thái vòng đời phim
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('movie:update')
  @ApiSuccessMessage('Cập nhật trạng thái phim thành công')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMovieStatusDto,
  ) {
    return this.moviesService.updateStatus(id, dto);
  }

  // 6. PATCH api/v1/movies/:id/genres - Cập nhật thể loại của phim
  @Patch(':id/genres')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('movie:update')
  @ApiSuccessMessage('Cập nhật thể loại phim thành công')
  updateGenres(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMovieGenresDto,
  ) {
    return this.moviesService.updateGenres(id, dto);
  }

  // 7. DELETE api/v1/movies/:id - Xóa phim
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('movie:delete')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.moviesService.remove(id);
  }
}
