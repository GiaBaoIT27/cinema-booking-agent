import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Relation,
} from 'typeorm';
import { RolePermission } from './role-permission.entity.js';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    nullable: false,
    comment: 'Mã hành động chuẩn resource:action (VD: movie:create)',
  })
  code: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    comment: 'Tên hiển thị quyền hạn (VD: Tạo mới phim)',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    comment: 'Nhóm chức năng (MOVIE_MANAGEMENT, SHOWTIME_MANAGEMENT, ...)',
  })
  module: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Mô tả chi tiết quyền',
  })
  description: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @OneToMany(
    () => RolePermission,
    (rolePermission) => rolePermission.permission,
  )
  rolePermissions: Relation<RolePermission>[];
}
