import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Role } from './role.entity.js';
import { Cineplex } from '../../cinemas/entities/cineplex.entity.js'; // Thay đổi đường dẫn thực tế của bạn

@Entity('user_roles')
// CHỈ MỤC 1: Đảm bảo tính duy nhất tuyệt đối khi gán quyền tại một Cụm rạp cụ thể (Cineplex Scope)
@Index('idx_user_role_cineplex_unique', ['userId', 'roleId', 'cineplexId'], {
  unique: true,
  where: 'cineplex_id IS NOT NULL',
})
// CHỈ MỤC 2 (BẺ KHÓA POSTGRES NULL): Đảm bảo tính duy nhất tuyệt đối khi gán quyền Toàn hệ thống (Global Scope)
@Index('idx_user_role_global_unique', ['userId', 'roleId'], {
  unique: true,
  where: 'cineplex_id IS NULL',
})
export class UserRole {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'bigint', nullable: false })
  userId: string;

  @Column({ name: 'role_id', type: 'bigint', nullable: false })
  roleId: string;

  @Column({
    name: 'cineplex_id',
    type: 'bigint',
    nullable: true,
    comment: 'Cụm rạp làm việc (NULL = Toàn hệ thống / Global Scope)',
  })
  cineplexId: string | null;

  // Relation đến Bảng Users
  @ManyToOne(() => User, (user) => user.userRoles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: any;

  // Relation đến Bảng Roles
  @ManyToOne(() => Role, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id' })
  role: any;

  // Relation đến Bảng Cineplex (Ràng buộc RESTRICT chống xóa rạp khi đang có nhân viên làm việc)
  @ManyToOne(() => Cineplex, {
    onDelete: 'RESTRICT',
    nullable: true,
  })
  @JoinColumn({ name: 'cineplex_id' })
  cineplex: any;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
