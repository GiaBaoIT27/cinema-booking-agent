import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie } from './entities/movie.entity.js';
import { Genre } from '#modules/genres/entities/genre.entity.js';
import { Distributor } from '#modules/distributors/entities/distributor.entity.js';
import { MoviesController } from './movies.controller.js';
import { MoviesService } from './movies.service.js';
import { RedisModule } from '#src/common/redis/redis.module.js';
import { UploadModule } from '#modules/upload/upload.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Movie, Genre, Distributor]),
    RedisModule,
    UploadModule,
  ],
  controllers: [MoviesController],
  providers: [MoviesService],
  exports: [MoviesService],
})
export class MoviesModule {}
