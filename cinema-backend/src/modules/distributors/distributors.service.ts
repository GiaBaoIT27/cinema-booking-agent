import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError, Not } from 'typeorm';
import { GetDistributorsQueryDto } from './dto/query-distributor.dto.js';
import { CreateDistributorDto } from './dto/create-distributor.dto.js';
import { UpdateDistributorDto } from './dto/update-distributor.dto.js';
import { UpdateDistributorStatusDto } from './dto/update-status.dto.js';
import { GetDistributorMoviesQueryDto } from './dto/distributor-movies-query.dto.js';
import { Distributor } from './entities/distributor.entity.js';
import { Movie } from '../movies/entities/movie.entity.js';
import { DistributorStatus } from './enums/distributor-status.enum.js';

@Injectable()
export class DistributorsService {
  private readonly logger = new Logger(DistributorsService.name);
  constructor(
    @InjectRepository(Distributor)
    private readonly distributorRepository: Repository<Distributor>,
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
  ) {}

  private escapeLikeString(str: string): string {
    return str.replace(/[%_]/g, '\\$&');
  }

  //GET /api/v1/distributors
  async findAll(queryDto: GetDistributorsQueryDto) {
    const { status, name, taxCode, page, limit } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder =
      this.distributorRepository.createQueryBuilder('distributor');

    // 1. Dynamic Filter: status
    if (status) {
      queryBuilder.andWhere('distributor.status = :status', { status });
    }

    // 2. Dynamic Filter: name (ILIKE partial match)
    if (name) {
      const safeName = this.escapeLikeString(name);
      queryBuilder.andWhere('distributor.name ILIKE :name', {
        name: `%${safeName}%`,
      });
    }

    // 3. Dynamic Filter: taxCode (ILIKE partial match)
    if (taxCode) {
      const safeTaxCode = this.escapeLikeString(taxCode);
      queryBuilder.andWhere('distributor.taxCode ILIKE :taxCode', {
        taxCode: `%${safeTaxCode}%`,
      });
    }

    // 4. Sorting & Pagination (ORDER BY id DESC theo Spec)
    queryBuilder.orderBy('distributor.id', 'DESC').skip(skip).take(limit);

    const [items, totalElements] = await queryBuilder.getManyAndCount();

    const formattedData = items.map((item) => ({
      ...item,
      id: Number(item.id),
    }));

    return {
      data: formattedData,
      pagination: {
        page,
        limit,
        totalElements,
        totalPages: Math.ceil(totalElements / limit) || 1,
      },
    };
  }

  //POST /api/v1/distributors
  async create(createDto: CreateDistributorDto) {
    const {
      name,
      taxCode,
      address,
      contactPerson,
      contactEmail,
      contactPhone,
      bankAccountNumber,
      bankName,
    } = createDto;

    // 1. Check trùng Tên NPH
    const existingName = await this.distributorRepository.findOne({
      where: { name },
      select: {
        id: true,
      },
    });

    if (existingName) {
      throw new ConflictException({
        errorCode: 'DISTRIBUTOR_NAME_ALREADY_EXISTS',
        message: `Tên nhà phát hành '${name}' đã tồn tại trên hệ thống`,
      });
    }

    // 2. Check trùng Mã số thuế
    const existingTaxCode = await this.distributorRepository.findOne({
      where: { taxCode },
      select: {
        id: true,
      },
    });

    if (existingTaxCode) {
      throw new ConflictException({
        errorCode: 'DISTRIBUTOR_TAX_CODE_ALREADY_EXISTS',
        message: `Mã số thuế '${taxCode}' đã tồn tại trên hệ thống`,
      });
    }

    // 3. Khởi tạo & Lưu Database
    try {
      const distributor = this.distributorRepository.create({
        name,
        taxCode,
        address,
        contactPerson,
        contactEmail,
        contactPhone,
        bankAccountNumber: bankAccountNumber ?? null,
        bankName: bankName ?? null,
        status: DistributorStatus.ACTIVE,
      });

      const saved = await this.distributorRepository.save(distributor);

      return {
        id: Number(saved.id),
        name: saved.name,
        taxCode: saved.taxCode,
        address: saved.address,
        contactPerson: saved.contactPerson,
        contactEmail: saved.contactEmail,
        contactPhone: saved.contactPhone,
        bankAccountNumber: saved.bankAccountNumber,
        bankName: saved.bankName,
        status: saved.status,
        createdAt: saved.createdAt,
        updatedAt: null,
      };
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as any).code === '23505'
      ) {
        const detail = (error as any).detail || '';
        if (detail.includes('name')) {
          throw new ConflictException({
            errorCode: 'DISTRIBUTOR_NAME_ALREADY_EXISTS',
            message: `Tên nhà phát hành '${name}' đã tồn tại trên hệ thống`,
          });
        }
        if (detail.includes('tax_code')) {
          throw new ConflictException({
            errorCode: 'DISTRIBUTOR_TAX_CODE_ALREADY_EXISTS',
            message: `Mã số thuế '${taxCode}' đã tồn tại trên hệ thống`,
          });
        }
      }
      throw error;
    }
  }

  // //GET /api/v1/distributors/:id
  // async findOne(id: number) {
  //   // 1. Tìm thông tin NPH theo ID
  //   const distributor = await this.distributorRepository.findOne({
  //     where: { id: id.toString() },
  //   });

  //   if (!distributor) {
  //     throw new NotFoundException({
  //       errorCode: 'DISTRIBUTOR_NOT_FOUND',
  //       message: `Không tìm thấy nhà phát hành với ID ${id}`,
  //     });
  //   }

  //   // 2. Thống kê tổng số phim thuộc NPH
  //   const movieCountResult = await this.distributorRepository.manager
  //     .createQueryBuilder()
  //     .select('COUNT(m.id)', 'count')
  //     .from('movies', 'm')
  //     .where('m.distributor_id = :id', { id })
  //     .getRawOne();

  //   const totalDistributedMovies = Number(movieCountResult?.count || 0);

  //   // 3. Lấy kỳ đối soát tài chính gần nhất
  //   const lastSettlement = await this.distributorRepository.manager
  //     .createQueryBuilder()
  //     .select('s.start_date', 'startDate')
  //     .addSelect('s.end_date', 'endDate')
  //     .from('financial_settlements', 's')
  //     .where('s.distributor_id = :id', { id })
  //     .andWhere("s.status = 'COMPLETED'")
  //     .orderBy('s.end_date', 'DESC')
  //     .getRawOne();

  //   let lastSettlementPeriod: string | null = null;
  //   if (lastSettlement?.startDate && lastSettlement?.endDate) {
  //     const formatDate = (date: Date | string) =>
  //       new Date(date).toISOString().split('T')[0];
  //     lastSettlementPeriod = `${formatDate(lastSettlement.startDate)} đến ${formatDate(lastSettlement.endDate)}`;
  //   }

  //   return {
  //     id: Number(distributor.id),
  //     name: distributor.name,
  //     taxCode: distributor.taxCode,
  //     address: distributor.address,
  //     contactPerson: distributor.contactPerson,
  //     contactEmail: distributor.contactEmail,
  //     contactPhone: distributor.contactPhone,
  //     bankAccountNumber: distributor.bankAccountNumber,
  //     bankName: distributor.bankName,
  //     status: distributor.status,
  //     summaryStats: {
  //       totalDistributedMovies,
  //       lastSettlementPeriod,
  //     },
  //     createdAt: distributor.createdAt,
  //     updatedAt: distributor.updatedAt,
  //   };
  // }

  //PUT /api/v1/distributors
  async update(id: number, updateDto: UpdateDistributorDto) {
    const stringId = id.toString();

    // 1. Kiểm tra tồn tại NPH
    const distributor = await this.distributorRepository.findOne({
      where: { id: stringId },
    });

    if (!distributor) {
      throw new NotFoundException({
        errorCode: 'DISTRIBUTOR_NOT_FOUND',
        message: `Không tìm thấy nhà phát hành với ID ${id}`,
      });
    }

    const {
      name,
      taxCode,
      address,
      contactPerson,
      contactEmail,
      contactPhone,
      bankAccountNumber,
      bankName,
    } = updateDto;

    // 2. Check trùng Tên NPH (loại trừ bản ghi hiện tại)
    const existingName = await this.distributorRepository.findOne({
      where: {
        name,
        id: Not(stringId),
      },
      select: {
        id: true,
      },
    });

    if (existingName) {
      throw new ConflictException({
        errorCode: 'DISTRIBUTOR_NAME_ALREADY_EXISTS',
        message: `Tên nhà phát hành '${name}' đã tồn tại trên hệ thống`,
      });
    }

    // 3. Check trùng Mã số thuế (loại trừ bản ghi hiện tại)
    const existingTaxCode = await this.distributorRepository.findOne({
      where: {
        taxCode,
        id: Not(stringId),
      },
      select: {
        id: true,
      },
    });

    if (existingTaxCode) {
      throw new ConflictException({
        errorCode: 'DISTRIBUTOR_TAX_CODE_ALREADY_EXISTS',
        message: `Mã số thuế '${taxCode}' đã tồn tại trên hệ thống`,
      });
    }

    // 4. Gán thông tin mới và lưu Database
    distributor.name = name;
    distributor.taxCode = taxCode;
    distributor.address = address;
    distributor.contactPerson = contactPerson;
    distributor.contactEmail = contactEmail;
    distributor.contactPhone = contactPhone;
    distributor.bankAccountNumber = bankAccountNumber ?? null;
    distributor.bankName = bankName ?? null;

    try {
      const saved = await this.distributorRepository.save(distributor);

      return {
        id: Number(saved.id),
        name: saved.name,
        taxCode: saved.taxCode,
        address: saved.address,
        contactPerson: saved.contactPerson,
        contactEmail: saved.contactEmail,
        contactPhone: saved.contactPhone,
        bankAccountNumber: saved.bankAccountNumber,
        bankName: saved.bankName,
        status: saved.status,
        updatedAt: saved.updatedAt,
      };
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as any).code === '23505'
      ) {
        const detail = (error as any).detail || '';
        if (detail.includes('name')) {
          throw new ConflictException({
            errorCode: 'DISTRIBUTOR_NAME_ALREADY_EXISTS',
            message: `Tên nhà phát hành '${name}' đã tồn tại trên hệ thống`,
          });
        }
        if (detail.includes('tax_code')) {
          throw new ConflictException({
            errorCode: 'DISTRIBUTOR_TAX_CODE_ALREADY_EXISTS',
            message: `Mã số thuế '${taxCode}' đã tồn tại trên hệ thống`,
          });
        }
      }
      throw error;
    }
  }

  //PATCH /api/v1/distributors/:id/status
  async updateStatus(id: number, updateStatusDto: UpdateDistributorStatusDto) {
    const { status } = updateStatusDto;

    // 1. Kiểm tra giá trị Enum status hợp lệ
    if (!Object.values(DistributorStatus).includes(status)) {
      throw new UnprocessableEntityException({
        errorCode: 'INVALID_DISTRIBUTOR_STATUS',
        message:
          'Trạng thái nhà phát hành chỉ được nhận giá trị ACTIVE hoặc SUSPENDED',
      });
    }

    // 2. Tìm NPH theo ID
    const distributor = await this.distributorRepository.findOne({
      where: { id: id.toString() },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    if (!distributor) {
      throw new NotFoundException({
        errorCode: 'DISTRIBUTOR_NOT_FOUND',
        message: `Không tìm thấy nhà phát hành với ID ${id}`,
      });
    }

    // 3. Cập nhật trạng thái
    distributor.status = status;
    const saved = await this.distributorRepository.save(distributor);

    // 4. Audit Log warning khi nhà phát hành bị chuyển sang SUSPENDED
    if (status === DistributorStatus.SUSPENDED) {
      this.logger.warn(
        `[AUDIT] Nhà phát hành '${distributor.name}' (ID: ${id}) đã bị SUSPENDED. Tác vụ tạo phim mới và tạo suất chiếu mới thuộc NPH này sẽ bị chặn.`,
      );
    }

    return {
      id: Number(saved.id),
      status: saved.status,
      updatedAt: saved.updatedAt,
    };
  }

  async getDistributorMovies(
    id: number,
    queryDto: GetDistributorMoviesQueryDto,
  ) {
    const { status, page, limit } = queryDto;
    const skip = (page - 1) * limit;

    // 1. Kiểm tra sự tồn tại của Nhà phát hành
    const distributor = await this.distributorRepository.findOne({
      where: { id: id.toString() },
      select: {
        id: true,
        name: true,
      },
    });

    if (!distributor) {
      throw new NotFoundException({
        errorCode: 'DISTRIBUTOR_NOT_FOUND',
        message: `Không tìm thấy nhà phát hành với ID ${id}`,
      });
    }

    // 2. QueryBuilder chuẩn theo Movie Entity
    const qb = this.movieRepository
      .createQueryBuilder('movie')
      .select([
        'movie.id',
        'movie.title',
        'movie.originalTitle',
        'movie.durationMinutes',
        'movie.releaseDate',
        'movie.ageRating',
        'movie.status',
      ])
      .where('movie.distributorId = :id', { id });

    if (status) {
      qb.andWhere('movie.status = :status', { status });
    }

    const [movies, totalElements] = await qb
      .orderBy('movie.releaseDate', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // 3. Mapping chuẩn Response Schema (ánh xạ originalTitle -> englishTitle)
    const formattedData = movies.map((movie) => ({
      id: Number(movie.id),
      title: movie.title,
      englishTitle: movie.originalTitle ?? null, // Map originalTitle sang englishTitle theo Spec
      durationMinutes: movie.durationMinutes,
      releaseDate: movie.releaseDate
        ? new Date(movie.releaseDate).toISOString().split('T')[0]
        : null,
      ageRating: movie.ageRating,
      status: movie.status,
    }));

    return {
      data: formattedData,
      meta: {
        distributorInfo: {
          id: Number(distributor.id),
          name: distributor.name,
        },
        pagination: {
          page,
          limit,
          totalElements,
          totalPages: Math.ceil(totalElements / limit) || 1,
        },
      },
    };
  }
}
