import { Distributor } from '../entities/distributor.entity.js';
import { DistributorStatus } from '../enums/distributor-status.enum.js';

export interface DistributorSearchCriteria {
  status?: DistributorStatus;
  /** Khớp một phần, không phân biệt hoa thường (repository tự escape ký tự LIKE). */
  name?: string;
  taxCode?: string;
  page: number;
  limit: number;
}

export interface IDistributorRepository {
  /** Sắp xếp theo id giảm dần. */
  search(
    criteria: DistributorSearchCriteria,
  ): Promise<{ items: Distributor[]; total: number }>;

  findById(id: string): Promise<Distributor | null>;

  findByIds(ids: string[]): Promise<Distributor[]>;

  exists(id: string): Promise<boolean>;

  /** Truyền excludeId để bỏ qua chính bản ghi đang sửa. */
  existsName(name: string, excludeId?: string): Promise<boolean>;

  existsTaxCode(taxCode: string, excludeId?: string): Promise<boolean>;

  create(data: Partial<Distributor>): Distributor;

  /**
   * @throws DistributorUniqueViolationError khi vi phạm unique (name / tax_code).
   */
  save(distributor: Distributor): Promise<Distributor>;

  updateStatus(
    id: string,
    status: DistributorStatus,
  ): Promise<Pick<Distributor, 'id' | 'status' | 'updatedAt'>>;
}

export const DISTRIBUTOR_REPOSITORY = Symbol('DISTRIBUTOR_REPOSITORY');
