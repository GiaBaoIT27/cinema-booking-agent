import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { MoviesService } from './movies.service.js';
import { CreateMovieDto } from './dto/create-movie.dto.js';
import { FilterMovieDto } from './dto/filter-movie.dto.js';
import { UpdateMovieDto } from './dto/update-movie.dto.js';
import { UpdateMovieStatusDto } from './dto/update-movie-status.dto.js';
import { UpdateMovieGenresDto } from './dto/update-movie-genres.dto.js';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Post()
  create(@Body() createMovieDto: CreateMovieDto) {
    return this.moviesService.create(createMovieDto);
  }

  @Get()
  findAll(@Query() filterDto: FilterMovieDto) {
    return this.moviesService.findAll(filterDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.moviesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateMovieDto: UpdateMovieDto) {
    return this.moviesService.update(id, updateMovieDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateMovieStatusDto,
  ) {
    return this.moviesService.updateStatus(id, updateStatusDto);
  }

  @Put(':id/genres')
  updateGenres(
    @Param('id') id: string,
    @Body() updateGenresDto: UpdateMovieGenresDto,
  ) {
    return this.moviesService.updateGenres(id, updateGenresDto);
  }
}
