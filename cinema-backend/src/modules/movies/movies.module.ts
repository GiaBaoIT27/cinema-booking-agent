import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie } from './entities/movie.entity.js';
import { Genre } from '#modules/genres/entities/genre.entity.js';
import { MoviesController } from './movies.controller.js';
import { MoviesService } from './movies.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Movie, Genre])],
  controllers: [MoviesController],
  providers: [MoviesService],
  exports: [MoviesService],
})
export class MoviesModule {}
