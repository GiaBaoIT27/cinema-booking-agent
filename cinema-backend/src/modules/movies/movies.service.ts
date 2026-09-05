import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Movie } from '../movies/entities/movie.entity.js';
import { Genre } from '#modules/genres/entities/genre.entity.js';
import { CreateMovieDto } from '../movies/dto/create-movie.dto.js';
import { FilterMovieDto } from '../movies/dto/filter-movie.dto.js';
import { UpdateMovieDto } from '../movies/dto/update-movie.dto.js';
import { UpdateMovieStatusDto } from '../movies/dto/update-movie-status.dto.js';
import { UpdateMovieGenresDto } from '../movies/dto/update-movie-genres.dto.js';

@Injectable()
export class MoviesService {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
  ) {}

  async create(createMovieDto: CreateMovieDto): Promise<Movie> {
    const { genreIds, ...movieData } = createMovieDto;

    const genres = await this.genreRepository.findBy({ id: In(genreIds) });
    if (genres.length !== genreIds.length) {
      throw new BadRequestException(
        'Một hoặc nhiều mã thể loại phim không tồn tại',
      );
    }

    const movie = this.movieRepository.create({
      ...movieData,
      genres,
    });

    return await this.movieRepository.save(movie);
  }

  async findAll(filterDto: FilterMovieDto) {
    const { page = 1, limit = 10, search, status, genreId } = filterDto;
    const skip = (page - 1) * limit;

    const query = this.movieRepository
      .createQueryBuilder('movie')
      .leftJoinAndSelect('movie.genres', 'genre')
      .leftJoinAndSelect('movie.distributor', 'distributor');

    if (status) {
      query.andWhere('movie.status = :status', { status });
    }

    if (genreId) {
      query.andWhere('genre.id = :genreId', { genreId });
    }

    if (search) {
      query.andWhere(
        '(LOWER(movie.title) LIKE LOWER(:search) OR LOWER(movie.originalTitle) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    query.orderBy('movie.releaseDate', 'DESC').skip(skip).take(limit);

    const [items, total] = await query.getManyAndCount();

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Movie> {
    const movie = await this.movieRepository.findOne({
      where: { id },
      relations: {
        genres: true,
        distributor: true,
      },
    });

    if (!movie) {
      throw new NotFoundException(`Không tìm thấy phim có ID: ${id}`);
    }

    return movie;
  }

  async update(id: string, updateMovieDto: UpdateMovieDto): Promise<Movie> {
    const { genreIds, ...movieData } = updateMovieDto;
    const movie = await this.findOne(id);

    if (genreIds) {
      const genres = await this.genreRepository.findBy({ id: In(genreIds) });
      if (genres.length !== genreIds.length) {
        throw new BadRequestException(
          'Một hoặc nhiều mã thể loại phim không tồn tại',
        );
      }
      movie.genres = genres;
    }

    Object.assign(movie, movieData);
    return await this.movieRepository.save(movie);
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateMovieStatusDto,
  ): Promise<Movie> {
    const movie = await this.findOne(id);
    movie.status = updateStatusDto.status;
    return await this.movieRepository.save(movie);
  }

  async updateGenres(
    id: string,
    updateGenresDto: UpdateMovieGenresDto,
  ): Promise<Movie> {
    const movie = await this.findOne(id);
    const genres = await this.genreRepository.findBy({
      id: In(updateGenresDto.genreIds),
    });

    if (genres.length !== updateGenresDto.genreIds.length) {
      throw new BadRequestException(
        'Một hoặc nhiều mã thể loại phim không tồn tại',
      );
    }

    movie.genres = genres;
    return await this.movieRepository.save(movie);
  }
}
