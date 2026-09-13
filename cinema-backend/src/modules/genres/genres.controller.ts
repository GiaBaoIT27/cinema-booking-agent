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
  Delete,
} from '@nestjs/common';

import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { Public } from '#src/common/decorators/public.decorator.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';

import { GenresService } from './genres.service.js';
import { CreateGenreDto } from './dto/create-genre.dto.js';
import { GetGenresQueryDto } from './dto/query-genres.dto.js';
import { UpdateGenreDto } from './dto/update-genre.dto.js';
import { GetGenreMoviesQueryDto } from './dto/query-genre-movies.dto.js';

@Controller('genres')
export class GenresController {
  constructor(private readonly genreService: GenresService) {}

  // 1. GET api/v1/genres
  @Get()
  @HttpCode(HttpStatus.OK)
  @Public()
  getAllGenres(@Query() queryDto: GetGenresQueryDto) {
    return this.genreService.findAll(queryDto);
  }

  // 2. GET api/v1/genres/:id
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @Public()
  getGenreById(@Param('id', ParseIntPipe) id: number) {
    return this.genreService.findOne(id);
  }

  // 3. POST api/v1/genres
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('genre:create')
  createGenre(@Body() createDto: CreateGenreDto) {
    return this.genreService.create(createDto);
  }

  // 4. PUT api/v1/genres/:id
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('genre:update')
  updateGenre(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateGenreDto,
  ) {
    return this.genreService.update(id, updateDto);
  }

  // 5. DELETE api/v1/genres/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('genre:delete')
  deleteGenre(@Param('id', ParseIntPipe) id: number) {
    return this.genreService.remove(id);
  }

  // 6. GET api/v1/genres/:id/movies
  @Get(':id/movies')
  @Public()
  @HttpCode(HttpStatus.OK)
  async getMoviesByGenre(
    @Param('id', ParseIntPipe) id: number,
    @Query() queryDto: GetGenreMoviesQueryDto,
  ) {
    const { data: movies, pagination } =
      await this.genreService.findMoviesByGenre(id, queryDto);

    return {
      data: movies,
      meta: {
        genreId: id,
        pagination,
      },
    };
  }
}
