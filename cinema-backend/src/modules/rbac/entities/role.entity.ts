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
import { RoleCode } from '../enums/role.enum.js';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    nullable: false,
    comment: 'Mã định danh (SUPER_ADMIN, CINEMA_MANAGER, ...)',
  })
  code: RoleCode | string;

  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    nullable: false,
    comment: 'Tên hiển thị (Quản lý Rạp, Nhân viên Soát vé, ...)',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Mô tả chi tiết phạm vi quyền hạn',
  })
  description: string | null;

  // Xác định vai trò hệ thống không được phép chỉnh sửa
  @Column({
    name: 'is_system',
    type: 'boolean',
    default: false,
    comment: 'Đánh dấu vai trò mặc định của hệ thống',
  })
  isSystem: boolean;

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

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role)
  rolePermissions: Relation<RolePermission>[];
}
