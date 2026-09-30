import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Role } from './role.entity.js';

/**
 * Bảng gán vai trò cho người dùng tại một phạm vi (scope) nhất định.
 *
 * Thiết kế ranh giới module (Modular Monolith):
 *  - `role`: ManyToOne nội bộ module RBAC (cùng bounded context).
 *  - `userId`: Cột scalar tham chiếu Users module (soft FK, không ManyToOne cross-module).
 *  - `cineplexId`: Cột scalar tham chiếu Cinemas module (soft FK, không ManyToOne cross-module).
 */
@Entity('user_roles')
@Index('idx_user_role_cineplex_unique', ['userId', 'roleId', 'cineplexId'], {
  unique: true,
  where: 'cineplex_id IS NOT NULL',
})
@Index('idx_user_role_global_unique', ['userId', 'roleId'], {
  unique: true,
  where: 'cineplex_id IS NULL',
})
export class UserRole {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'bigint', nullable: false })
  userId: string;

  @ManyToOne('User', 'userRoles', {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'user_id' })
  user?: any;

  @Column({ name: 'role_id', type: 'bigint', nullable: false })
  roleId: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({
    name: 'cineplex_id',
    type: 'bigint',
    nullable: true,
    comment: 'Cụm rạp làm việc (NULL = Toàn hệ thống / Global Scope)',
  })
  cineplexId: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
