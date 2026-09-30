import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import { Cineplex } from '../entities/cineplex.entity.js';
import { Auditorium } from '../entities/auditorium.entity.js';
import { Showtime } from '#modules/showtimes/domain/entities/showtime.entity.js';
import { FnbItem } from '#modules/fnb/entities/fnb-item.entities.js';

import { RedisService } from '#src/core/redis/redis.service.js';
import {
  CINEPLEX_REDIS_KEYS,
  CINEPLEX_CACHE_TTL,
  CINEPLEX_FNB_CACHE_TTL,
} from '../constants/cineplex-redis.constant.js';

import { CineplexStatus } from '../enums/cineplex-status.enum.js';
import {
  GetCineplexesQueryDto,
  CineplexStatusQuery,
} from '../dto/cineplexes/query-cineplexes.dto.js';
import { CreateCineplexDto } from '../dto/cineplexes/create-cineplex.dto.js';
import { UpdateCineplexDto } from '../dto/cineplexes/update-cineplex.dto.js';
import { UpdateCineplexStatusDto } from '../dto/cineplexes/update-cineplex-status.dto.js';
import {
  GetAuditoriumsQueryDto,
  AuditoriumStatusQuery,
} from '../dto/cineplexes/query-cinesplex-auditoriums.dto.js';
import { GetCineplexShowtimesQueryDto } from '../dto/cineplexes/query-cineplex-showtimes.dto.js';
import { GetFnbItemsQueryDto } from '../dto/cineplexes/query-cineplexe-fnb-items.dto.js';

@Injectable()
export class CineplexService {
  private readonly logger = new Logger(CineplexService.name);

  constructor(
    @InjectRepository(Cineplex)
    private readonly cineplexRepository: Repository<Cineplex>,
    @InjectRepository(Auditorium)
    private readonly auditoriumRepository: Repository<Auditorium>,
    @InjectRepository(Showtime)
    private readonly showtimeRepository: Repository<Showtime>,
    @InjectRepository(FnbItem)
    private readonly fnbItemRepository: Repository<FnbItem>,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  // GET api/v1/cineplexes
  async findAll(queryDto: GetCineplexesQueryDto) {
    const {
      provinceId,
      wardId,
      latitude,
      longitude,
      radiusKm,
      status,
      search,
      page,
      limit,
    } = queryDto;

    // 1. Validation ràng buộc tọa độ GPS
    const hasLat = latitude !== undefined && latitude !== null;
    const hasLng = longitude !== undefined && longitude !== null;

    if ((hasLat && !hasLng) || (!hasLat && hasLng)) {
      throw new BadRequestException({
        errorCode: 'MISSING_COORDINATE_PAIR',
        message: 'Tọa độ latitude và longitude phải được truyền đồng thời',
      });
    }
    // 2. Định nghĩa Key Cache
    const queryStr = `p=${provinceId || 'null'}:w=${wardId || 'null'}:lat=${latitude || 'null'}:lng=${longitude || 'null'}:r=${radiusKm || 'null'}:st=${status || 'all'}:s=${search || 'null'}:p=${page}:l=${limit}`;
    const cacheKey = CINEPLEX_REDIS_KEYS.LIST(queryStr);

    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const queryBuilder = this.cineplexRepository.createQueryBuilder('c');

        if (provinceId) {
          queryBuilder.andWhere('c.provinceId = :provinceId', { provinceId });
        }

        if (wardId) {
          queryBuilder.andWhere('c.wardId = :wardId', { wardId });
        }

        if (status && status !== CineplexStatusQuery.ALL) {
          queryBuilder.andWhere('c.status = :status', { status });
        }

        if (search) {
          queryBuilder.andWhere(
            '(c.code ILIKE :search OR c.name ILIKE :search OR c.address ILIKE :search)',
            { search: `%${search}%` },
          );
        }

        // --- Xử lý tính khoảng cách GPS ---
        let distanceExpr = '';
        if (hasLat && hasLng) {
          distanceExpr = `(
          6371 * acos(
            least(1.0, greatest(-1.0,
              cos(radians(:latitude)) * cos(radians(c.latitude)) *
              cos(radians(c.longitude) - radians(:longitude)) +
              sin(radians(:latitude)) * sin(radians(c.latitude))
            ))
          )
        )`;

          queryBuilder
            .addSelect(distanceExpr, 'distanceKm')
            .setParameters({ latitude, longitude })
            .groupBy('c.id')
            .having(`${distanceExpr} <= :radiusKm`, { radiusKm })
            .orderBy(' "distanceKm"', 'ASC');
        } else {
          queryBuilder.orderBy('c.name', 'ASC');
        }

        if (hasLat && hasLng) {
          queryBuilder.addOrderBy('c.name', 'ASC');
        }

        queryBuilder.skip((page - 1) * limit).take(limit);

        const { entities, raw } = await queryBuilder.getRawAndEntities();

        const countQueryBuilder = queryBuilder.clone();
        countQueryBuilder.skip(undefined).take(undefined);
        const countRaw = await countQueryBuilder.getRawMany();
        const totalElements = countRaw.length;
        const totalPages = Math.ceil(totalElements / limit);

        const formattedItems = entities.map((entity, index) => {
          const rawItem = raw[index];
          const distanceKm = rawItem?.distanceKm;

          return {
            ...entity,
            id: Number(entity.id),
            provinceId: Number(entity.provinceId),
            wardId: Number(entity.wardId),
            distanceKm:
              distanceKm !== null && distanceKm !== undefined
                ? Number(Number(distanceKm).toFixed(2))
                : null,
          };
        });

        return {
          items: formattedItems,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            totalElements,
            totalPages,
          },
        };
      },
      CINEPLEX_CACHE_TTL,
    );
  }

  // GET api/v1/cineplexes/:id
  async findOne(id: number) {
    const cacheKey = CINEPLEX_REDIS_KEYS.DETAIL(id);

    // 2. Truy vấn bằng TypeORM Repository API
    const result = await this.redisService.getOrSet(
      cacheKey,
      async () => {
        const cineplex = await this.cineplexRepository.findOne({
          where: { id: id.toString() },
          relations: {
            province: true,
            ward: true,
          },
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true,
            phoneNumber: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            province: {
              id: true,
              code: true,
              name: true,
            },
            ward: {
              id: true,
              code: true,
              name: true,
            },
          },
        });

        if (!cineplex) return null;

        return {
          id: Number(cineplex.id),
          code: cineplex.code,
          name: cineplex.name,
          address: cineplex.address,
          latitude:
            cineplex.latitude !== null ? Number(cineplex.latitude) : null,
          longitude:
            cineplex.longitude !== null ? Number(cineplex.longitude) : null,
          phoneNumber: cineplex.phoneNumber,
          status: cineplex.status,
          province: cineplex.province
            ? {
                id: Number(cineplex.province.id),
                code: cineplex.province.code,
                name: cineplex.province.name,
              }
            : null,
          ward: cineplex.ward
            ? {
                id: Number(cineplex.ward.id),
                code: cineplex.ward.code,
                name: cineplex.ward.name,
              }
            : null,
          createdAt: cineplex.createdAt,
          updatedAt: cineplex.updatedAt,
        };
      },
      CINEPLEX_CACHE_TTL,
    );

    if (!result) {
      throw new NotFoundException({
        errorCode: 'CINEPLEX_NOT_FOUND',
        message: `Cụm rạp với ID ${id} không tồn tại trên hệ thống`,
      });
    }
    return result;
  }

  // POST api/v1/cineplexes
  async create(createDto: CreateCineplexDto) {
    // 1. Kiểm tra Trùng lặp Mã Code (409 Conflict)
    const existingCode = await this.cineplexRepository.findOne({
      where: { code: createDto.code },
      select: { id: true, code: true },
    });

    if (existingCode) {
      throw new ConflictException({
        errorCode: 'CINEPLEX_CODE_ALREADY_EXISTS',
        message: `Mã cụm rạp '${createDto.code}' đã tồn tại trên hệ thống`,
      });
    }

    // 2. Kiểm tra Khóa ngoại Province & Ward (400 Bad Request)
    const [provinceCount, wardCount] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*)::int as count FROM provinces WHERE id = $1`,
        [createDto.provinceId],
      ),
      this.dataSource.query(
        `SELECT COUNT(*)::int as count FROM wards WHERE id = $1 AND province_id = $2`,
        [createDto.wardId, createDto.provinceId],
      ),
    ]);

    if (provinceCount[0].count === 0 || wardCount[0].count === 0) {
      throw new BadRequestException({
        errorCode: 'PROVINCE_OR_WARD_NOT_FOUND',
        message:
          'Tỉnh/Thành phố hoặc Xã/Phường không tồn tại hoặc không hợp lệ',
      });
    }

    // 3. Khởi tạo & Lưu Cụm rạp mới vào DB
    const newCineplex = this.cineplexRepository.create({
      code: createDto.code,
      name: createDto.name,
      provinceId: createDto.provinceId,
      wardId: createDto.wardId,
      address: createDto.address,
      latitude: createDto.latitude ?? null,
      longitude: createDto.longitude ?? null,
      phoneNumber: createDto.phoneNumber ?? null,
      status: CineplexStatus.ACTIVE,
    });

    const savedCineplex = await this.cineplexRepository.save(newCineplex);

    // Evict Redis Cache liên quan đến cụm rạp
    await this.redisService.delByPattern(CINEPLEX_REDIS_KEYS.PATTERN_ALL);

    // 5. Trả về kết quả khởi tạo thành công
    return {
      id: Number(savedCineplex.id),
      code: savedCineplex.code,
      name: savedCineplex.name,
      provinceId: Number(savedCineplex.provinceId),
      wardId: Number(savedCineplex.wardId),
      address: savedCineplex.address,
      latitude:
        savedCineplex.latitude !== null ? Number(savedCineplex.latitude) : null,
      longitude:
        savedCineplex.longitude !== null
          ? Number(savedCineplex.longitude)
          : null,
      phoneNumber: savedCineplex.phoneNumber,
      status: savedCineplex.status,
      createdAt: savedCineplex.createdAt,
      updatedAt: savedCineplex.updatedAt,
    };
  }

  // PUT api/v1/cineplexes/:id
  async update(id: number, updateDto: UpdateCineplexDto) {
    // 1. Kiểm tra tồn tại Cụm rạp (404 Not Found)
    const cineplex = await this.cineplexRepository.findOne({
      where: { id: id.toString() },
    });

    if (!cineplex) {
      throw new NotFoundException({
        errorCode: 'CINEPLEX_NOT_FOUND',
        message: `Cụm rạp với ID ${id} không tồn tại trên hệ thống`,
      });
    }
    const {
      code,
      name,
      provinceId,
      wardId,
      address,
      latitude,
      longitude,
      phoneNumber,
    } = updateDto;

    // 2. Kiểm tra Trùng Code nếu mã code thay đổi (409 Conflict)
    if (code !== cineplex.code) {
      const existingCode = await this.cineplexRepository.findOne({
        where: { code, id: Not(id.toString()) },
        select: {
          id: true,
        },
      });

      if (existingCode) {
        throw new ConflictException({
          errorCode: 'CINEPLEX_CODE_ALREADY_EXISTS',
          message: `Mã cụm rạp '${updateDto.code}' đã được sử dụng bởi cụm rạp khác`,
        });
      }
    }

    // 3. Kiểm tra Khóa ngoại Province & Ward (400 Bad Request)
    const [provinceCount, wardCount] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*)::int as count FROM provinces WHERE id = $1`,
        [updateDto.provinceId],
      ),
      this.dataSource.query(
        `SELECT COUNT(*)::int as count FROM wards WHERE id = $1 AND province_id = $2`,
        [updateDto.wardId, updateDto.provinceId],
      ),
    ]);

    if (provinceCount[0].count === 0 || wardCount[0].count === 0) {
      throw new NotFoundException({
        errorCode: 'PROVINCE_OR_WARD_NOT_FOUND',
        message:
          'Tỉnh/Thành phố hoặc Xã/Phường không tồn tại hoặc không hợp lệ',
      });
    }

    // 4. Cập nhật thuộc tính và lưu vào DB
    cineplex.code = code;
    cineplex.name = name;
    cineplex.provinceId = provinceId;
    cineplex.wardId = wardId;
    cineplex.address = address;
    cineplex.latitude = latitude ?? null;
    cineplex.longitude = longitude ?? null;
    cineplex.phoneNumber = phoneNumber ?? null;

    const updatedCineplex = await this.cineplexRepository.save(cineplex);

    // 5. Evict Redis Cache liên quan đến cụm rạp
    await this.redisService.delByPattern(CINEPLEX_REDIS_KEYS.PATTERN_ALL);

    // 6. Trả về Response
    return {
      id: Number(updatedCineplex.id),
      code: updatedCineplex.code,
      name: updatedCineplex.name,
      provinceId: Number(updatedCineplex.provinceId),
      wardId: Number(updatedCineplex.wardId),
      address: updatedCineplex.address,
      latitude:
        updatedCineplex.latitude !== null
          ? Number(updatedCineplex.latitude)
          : null,
      longitude:
        updatedCineplex.longitude !== null
          ? Number(updatedCineplex.longitude)
          : null,
      phoneNumber: updatedCineplex.phoneNumber,
      status: updatedCineplex.status,
      createdAt: updatedCineplex.createdAt,
      updatedAt: updatedCineplex.updatedAt,
    };
  }

  // PATCH api/v1/cineplexes/:id/status
  async updateStatus(id: number, updateStatusDto: UpdateCineplexStatusDto) {
    const { status, reason } = updateStatusDto;

    // 1. Kiểm tra tồn tại Cụm rạp (404 Not Found)
    const cineplex = await this.cineplexRepository.findOne({
      where: { id: id.toString() },
      select: { id: true, code: true, status: true },
    });

    if (!cineplex) {
      throw new NotFoundException({
        errorCode: 'CINEPLEX_NOT_FOUND',
        message: `Cụm rạp với ID ${id} không tồn tại trên hệ thống`,
      });
    }

    // 2. Thực thi Transaction: Cập nhật trạng thái & Xử lý Cascading Action cho Suất chiếu
    const updatedCineplex = await this.dataSource.transaction(
      async (entityManager) => {
        // Nếu rạp chuyển sang CLOSED hoặc MAINTENANCE từ trạng thái ACTIVE
        if (
          (status === CineplexStatus.CLOSED ||
            status === CineplexStatus.MAINTENANCE) &&
          cineplex.status === CineplexStatus.ACTIVE
        ) {
          // Tự động hủy toàn bộ các suất chiếu OPEN chưa diễn ra thuộc rạp này
          await entityManager.query(
            `
          UPDATE showtimes s
          SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
          FROM auditoriums a
          WHERE s.auditorium_id = a.id
            AND a.cineplex_id = $1
            AND s.start_time > CURRENT_TIMESTAMP
            AND s.status = 'OPEN'
          `,
            [id],
          );

          this.logger.warn(
            `[Cascading Action] Automatically cancelled future open showtimes for Cineplex ID ${id}`,
          );

          // TODO: Phát Event Async (hoặc RabbitMQ/Kafka) gửi thông báo hoàn tiền sang Payment Service
        }

        // Cập nhật trạng thái Cụm rạp
        await entityManager.update(Cineplex, { id: id.toString() }, { status });

        return entityManager.findOneOrFail(Cineplex, {
          where: { id: id.toString() },
          select: { id: true, code: true, status: true, updatedAt: true },
        });
      },
    );

    // 3. Invalidate Redis Cache (Xóa cache chi tiết rạp, danh sách rạp và lịch chiếu)
    // await this.cacheManager.del(`cineplexes:id=${id}`);
    // await this.clearCineplexCachePattern();
    // await this.clearShowtimesCachePattern();

    // 4. Trả về Response
    return {
      id: Number(updatedCineplex.id),
      code: updatedCineplex.code,
      status: updatedCineplex.status,
      reason: reason ?? null,
      updatedAt: updatedCineplex.updatedAt,
    };
  }

  // GET api/v1/cineplexes/:id/auditoriums
  async findAuditoriumsByCineplexId(
    cineplexId: number,
    queryDto: GetAuditoriumsQueryDto,
  ) {
    const statusFilter = queryDto.status || AuditoriumStatusQuery.ACTIVE;
    const cacheKey = CINEPLEX_REDIS_KEYS.AUDITORIUMS(cineplexId, statusFilter);

    const result = await this.redisService.getOrSet(
      cacheKey,
      async () => {
        const cineplexExists = await this.cineplexRepository.count({
          where: { id: cineplexId.toString() },
        });

        if (!cineplexExists) {
          throw new NotFoundException({
            errorCode: 'CINEPLEX_NOT_FOUND',
            message: `Cụm rạp với ID ${cineplexId} không tồn tại trên hệ thống`,
          });
        }

        // 2. Lọc điều kiện
        const whereCondition: any = { cineplexId };
        if (statusFilter !== AuditoriumStatusQuery.ALL) {
          whereCondition.status = statusFilter;
        }

        // 3. Truy vấn danh sách phòng chiếu
        const auditoriums = await this.auditoriumRepository.find({
          where: whereCondition,
          order: { name: 'ASC' },
          select: {
            id: true,
            cineplexId: true,
            code: true,
            name: true,
            screenType: true,
            audioType: true,
            totalSeats: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        // 4. Transform Dữ liệu Trả về
        return auditoriums.map((auditorium) => ({
          id: Number(auditorium.id),
          cineplexId: Number(auditorium.cineplexId),
          code: auditorium.code,
          name: auditorium.name,
          screenType: auditorium.screenType,
          audioType: auditorium.audioType,
          totalSeats: auditorium.totalSeats,
          status: auditorium.status,
          createdAt: auditorium.createdAt,
          updatedAt: auditorium.updatedAt,
        }));
      },
      CINEPLEX_CACHE_TTL,
    );
    if (result === null) {
      throw new NotFoundException({
        errorCode: 'CINEPLEX_NOT_FOUND',
        message: `Cụm rạp với ID ${cineplexId} không tồn tại trên hệ thống`,
      });
    }
    return result;
  }

  // GET api/v1/cineplexes/:id/showtimes
  async findShowtimesByCineplexId(
    cineplexId: number,
    queryDto: GetCineplexShowtimesQueryDto,
  ) {
    const { movieId } = queryDto;

    // Mặc định lấy ngày hiện tại (YYYY-MM-DD) nếu không truyền vào
    const targetDateStr =
      queryDto.date || new Date().toISOString().split('T')[0];

    const cacheKey = CINEPLEX_REDIS_KEYS.SHOWTIMES(
      cineplexId,
      targetDateStr,
      movieId || 'all',
    );
    const result = await this.redisService.getOrSet(
      cacheKey,
      async () => {
        // 1. Kiểm tra tồn tại Cụm rạp & Trạng thái hoạt động
        const cineplex = await this.cineplexRepository.findOne({
          where: { id: cineplexId.toString() },
          select: { id: true, status: true },
        });

        if (!cineplex) {
          throw new NotFoundException({
            errorCode: 'CINEPLEX_NOT_FOUND',
            message: `Cụm rạp với ID ${cineplexId} không tồn tại trên hệ thống`,
          });
        }

        // Nếu rạp đóng cửa -> Trả về danh sách rỗng
        if (cineplex.status === CineplexStatus.CLOSED) {
          return [];
        }
        // 3. Xử lý khoảng thời gian trong ngày (00:00:00.000 -> 23:59:59.999)
        const startOfDay = new Date(`${targetDateStr}T00:00:00.000Z`);
        const endOfDay = new Date(`${targetDateStr}T23:59:59.999Z`);

        // 4. Query Database với QueryBuilder
        const queryBuilder = this.showtimeRepository
          .createQueryBuilder('s')
          .innerJoinAndSelect('s.auditorium', 'a')
          .innerJoinAndSelect('s.movie', 'm')
          .where('a.cineplexId = :cineplexId', { cineplexId })
          .andWhere('s.startTime >= :startOfDay AND s.startTime <= :endOfDay', {
            startOfDay,
            endOfDay,
          })
          .andWhere("s.status IN ('SCHEDULED', 'OPEN')");

        if (movieId) {
          queryBuilder.andWhere('m.id = :movieId', { movieId });
        }
        queryBuilder.orderBy('m.id', 'ASC').addOrderBy('s.startTime', 'ASC');

        const showtimes = await queryBuilder.getMany();

        // 5. Grouping dữ liệu theo Phim (Movie)
        const movieGroupMap = new Map<number, any>();

        for (const st of showtimes) {
          const mId = Number(st.movie.id);

          if (!movieGroupMap.has(mId)) {
            movieGroupMap.set(mId, {
              movieId: mId,
              movieTitle: st.movie.title,
              posterUrl: st.movie.posterUrl,
              durationMinutes: st.movie.durationMinutes,
              ageRating: st.movie.ageRating,
              showtimes: [],
            });
          }

          movieGroupMap.get(mId).showtimes.push({
            showtimeId: Number(st.id),
            auditoriumId: Number(st.auditorium.id),
            auditoriumName: st.auditorium.name,
            projectionType: st.projectionType,
            audioLanguage: st.audioLanguage,
            subtitleLanguage: st.subtitleLanguage,
            startTime: st.startTime,
            endTime: st.endTime,
            status: st.status,
          });
        }
        return Array.from(movieGroupMap.values());
      },
      CINEPLEX_CACHE_TTL,
    );
    if (result === null) {
      throw new NotFoundException({
        errorCode: 'CINEPLEX_NOT_FOUND',
        message: `Cụm rạp với ID ${cineplexId} không tồn tại trên hệ thống`,
      });
    }
    return result;
  }

  // GET api/v1/cineplexes/:id/fnb-items
  async findFnbItemsByCineplexId(
    cineplexId: number,
    queryDto: GetFnbItemsQueryDto,
  ) {
    const { category } = queryDto;
    const cacheKey = CINEPLEX_REDIS_KEYS.FNB_ITEMS(
      cineplexId,
      category || 'all',
    );
    const result = await this.redisService.getOrSet(
      cacheKey,
      async () => {
        // 1. Kiểm tra Tồn tại & Trạng thái Cụm rạp
        const cineplex = await this.cineplexRepository.findOne({
          where: { id: cineplexId.toString() },
          select: { id: true, status: true },
        });

        if (!cineplex) {
          throw new NotFoundException({
            errorCode: 'CINEPLEX_NOT_FOUND',
            message: `Cụm rạp với ID ${cineplexId} không tồn tại trên hệ thống`,
          });
        }

        // Nếu rạp CLOSED -> Trả về mảng rỗng []
        if (cineplex.status === CineplexStatus.CLOSED) {
          return [];
        }

        // 3. Truy vấn Sản phẩm F&B đang hoạt động (is_active = true)
        const whereCondition: any = { isActive: true };
        if (category) {
          whereCondition.category = category;
        }

        const fnbItems = await this.fnbItemRepository.find({
          where: whereCondition,
          order: {
            category: 'ASC',
            name: 'ASC',
          },
          select: {
            id: true,
            sku: true,
            name: true,
            type: true,
            category: true,
            unit: true,
            basePrice: true,
            imageUrl: true,
            description: true,
            isActive: true,
          },
        });

        // 4. Format Dữ liệu Trả về
        return fnbItems.map((item) => ({
          id: Number(item.id),
          sku: item.sku,
          name: item.name,
          type: item.type,
          category: item.category,
          unit: item.unit,
          basePrice: Number(item.basePrice),
          imageUrl: item.imageUrl,
          description: item.description,
          isActive: item.isActive,
        }));
      },
      CINEPLEX_FNB_CACHE_TTL,
    );

    if (result === null) {
      throw new NotFoundException({
        errorCode: 'CINEPLEX_NOT_FOUND',
        message: `Cụm rạp với ID ${cineplexId} không tồn tại trên hệ thống`,
      });
    }
    return result;
  }
}
