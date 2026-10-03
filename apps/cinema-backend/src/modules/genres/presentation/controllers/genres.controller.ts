import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Public } from '#src/common/decorators/public.decorator.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';
import { GenresService } from '../../application/services/genres.service.js';
import { CreateGenreDto } from '../../application/dto/create-genre.dto.js';
import { GetGenresQueryDto } from '../../application/dto/query-genres.dto.js';
import { UpdateGenreDto } from '../../application/dto/update-genre.dto.js';
import { GetGenreMoviesQueryDto } from '../../application/dto/query-genre-movies.dto.js';

@Controller('genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  // 1. GET api/v1/genres
  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  getAllGenres(@Query() query: GetGenresQueryDto) {
    return this.genresService.findAll(query);
  }

  // 2. GET api/v1/genres/:id
  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  getGenreById(@Param('id', ParseIntPipe) id: number) {
    return this.genresService.findOne(id);
  }

  // 3. POST api/v1/genres
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('genre:create')
  createGenre(@Body() dto: CreateGenreDto) {
    return this.genresService.create(dto);
  }

  // 4. PUT api/v1/genres/:id
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('genre:update')
  updateGenre(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGenreDto,
  ) {
    return this.genresService.update(id, dto);
  }

  // 5. DELETE api/v1/genres/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('genre:delete')
  deleteGenre(@Param('id', ParseIntPipe) id: number) {
    return this.genresService.remove(id);
  }

  // 6. GET api/v1/genres/:id/movies
  @Get(':id/movies')
  @Public()
  @HttpCode(HttpStatus.OK)
  getMoviesByGenre(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: GetGenreMoviesQueryDto,
  ) {
    return this.genresService.findMoviesByGenre(id, query);
  }
}
