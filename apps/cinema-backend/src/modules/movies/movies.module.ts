import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie } from './entities/movie.entity.js';
import { Genre } from '#modules/genres/entities/genre.entity.js';
import { Distributor } from '#modules/distributors/entities/distributor.entity.js';
import { Showtime } from '#modules/showtimes/domain/entities/showtime.entity.js';
import { MoviesController } from './movies.controller.js';
import { MoviesService } from './movies.service.js';
import { RedisModule } from '#src/core/redis/redis.module.js';
import { UploadModule } from '#modules/upload/upload.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Movie, Genre, Distributor, Showtime]),
    RedisModule,
    UploadModule,
  ],
  controllers: [MoviesController],
  providers: [MoviesService],
  exports: [MoviesService],
})
export class MoviesModule {}
