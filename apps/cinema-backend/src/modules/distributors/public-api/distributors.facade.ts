import { Inject, Injectable } from '@nestjs/common';
import { Distributor } from '../domain/entities/distributor.entity.js';
import { DistributorStatus } from '../domain/enums/distributor-status.enum.js';
import { DISTRIBUTOR_REPOSITORY } from '../domain/repositories/distributor.repository.interface.js';
import type { IDistributorRepository } from '../domain/repositories/distributor.repository.interface.js';
import type { DistributorSummaryDto } from './dto/distributor-summary.dto.js';

/**
 * Facade công khai của Distributors module — cổng giao tiếp DUY NHẤT với các module khác
 * (movies, showtimes, financial-settlements...).
 *
 * Các module khác CHỈ import từ `#modules/distributors/public-api` và chỉ nhận DTO tóm tắt,
 * không bao giờ nhận entity nội bộ. Mọi hàm trả boolean/null, không ném HTTP exception.
 */
@Injectable()
export class DistributorsFacade {
  constructor(
    @Inject(DISTRIBUTOR_REPOSITORY)
    private readonly distributorRepository: IDistributorRepository,
  ) {}

  async getDistributorById(
    distributorId: string | number,
  ): Promise<DistributorSummaryDto | null> {
    const distributor = await this.distributorRepository.findById(
      String(distributorId),
    );
    return distributor ? toSummary(distributor) : null;
  }

  /** Lấy hàng loạt (gộp tên NPH vào danh sách phim mà không cần JOIN xuyên module). */
  async getDistributorsByIds(
    distributorIds: Array<string | number>,
  ): Promise<DistributorSummaryDto[]> {
    const distributors = await this.distributorRepository.findByIds([
      ...new Set(distributorIds.map(String)),
    ]);
    return distributors.map(toSummary);
  }

  async exists(distributorId: string | number): Promise<boolean> {
    return this.distributorRepository.exists(String(distributorId));
  }

  /**
   * NPH tồn tại và đang ACTIVE. Module movies/showtimes dùng để chặn tạo phim/suất chiếu
   * mới của NPH bị SUSPENDED.
   */
  async isActive(distributorId: string | number): Promise<boolean> {
    const distributor = await this.distributorRepository.findById(
      String(distributorId),
    );
    return distributor?.status === DistributorStatus.ACTIVE;
  }
}

// Entity → DTO tóm tắt (ranh giới: không để entity nội bộ lọt ra ngoài module)
const toSummary = (distributor: Distributor): DistributorSummaryDto => ({
  id: Number(distributor.id),
  name: distributor.name,
  taxCode: distributor.taxCode,
  status: distributor.status,
});
