import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { UserStatus } from '../enums/user-status.enum.js';
import { MembershipTier } from '../enums/membership-tier.enum.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({
    name: 'full_name',
    type: 'varchar',
    length: 150,
    nullable: false,
    comment: 'Họ và tên người dùng',
  })
  fullName: string;

  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    nullable: false,
    comment: 'Email đăng nhập & nhận vé',
  })
  email: string;

  @Index({ unique: true })
  @Column({
    name: 'phone_number',
    type: 'varchar',
    length: 20,
    unique: true,
    nullable: false,
    comment: 'Số điện thoại nhận SMS/Zalo ONS',
  })
  phoneNumber: string;

  // select: false để không bao giờ vô tình leak password_hash ra API response
  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: false,
    select: false,
    comment: 'Mật khẩu đã mã hóa (Bcrypt)',
  })
  passwordHash: string;

  @Column({
    name: 'date_of_birth',
    type: 'date',
    nullable: true,
    comment: 'Ngày sinh (xác thực độ tuổi xem phim)',
  })
  dateOfBirth: Date | null;

  @Column({
    name: 'membership_tier',
    type: 'varchar',
    length: 20,
    default: MembershipTier.MEMBER,
    comment: 'Hạng thành viên (MEMBER, VIP, VVIP)',
  })
  membershipTier: MembershipTier;

  @Column({
    name: 'loyalty_points',
    type: 'int',
    default: 0,
    comment: 'Điểm thưởng tích lũy',
  })
  loyaltyPoints: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: UserStatus.ACTIVE,
    comment: 'Trạng thái tài khoản (ACTIVE, UNVERIFIED, BLOCKED)',
  })
  status: UserStatus;

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

  // Sử dụng chuỗi 'UserRole' thay vì import thực thể từ rbac module để bảo vệ ranh giới module
  @OneToMany('UserRole', 'user')
  userRoles?: any[];
}
