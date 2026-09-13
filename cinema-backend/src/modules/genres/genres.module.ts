import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Genre } from './entities/genre.entity.js';
import { GenresController } from './genres.controller.js';
import { GenresService } from './genres.service.js';
import { RedisModule } from '#src/common/redis/redis.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Genre]), RedisModule],
  controllers: [GenresController],
  providers: [GenresService],
  exports: [GenresService],
})
export class GenresModule {}
