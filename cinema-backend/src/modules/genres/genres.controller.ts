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
  @Public()
  @HttpCode(HttpStatus.OK)
  getAllGenres(@Query() queryDto: GetGenresQueryDto) {
    return this.genreService.findAll(queryDto);
  }

  // 2. GET api/v1/genres/:id
  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  getGenreById(@Param('id', ParseIntPipe) id: number) {
    return this.genreService.findOne(id);
  }

  // 3. POST api/v1/genres
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  // @RequirePermissions('genre:create')
  @HttpCode(HttpStatus.CREATED)
  createGenre(@Body() createDto: CreateGenreDto) {
    return this.genreService.create(createDto);
  }

  // 4. PUT api/v1/genres/:id
  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('genre:update')
  @HttpCode(HttpStatus.OK)
  updateGenre(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateGenreDto,
  ) {
    return this.genreService.update(id, updateDto);
  }

  // 5. DELETE api/v1/genres/:id
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  // @RequirePermissions('genre:delete')
  @HttpCode(HttpStatus.OK)
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
