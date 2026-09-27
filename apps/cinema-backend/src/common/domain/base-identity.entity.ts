import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export abstract class BaseIdentityEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
    comment: 'Thời điểm bản ghi được khởi tạo',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    name: 'updated_at',
    comment: 'Thời điểm bản ghi được cập nhật gần nhất',
  })
  updatedAt: Date;

  @DeleteDateColumn({
    type: 'timestamp with time zone',
    name: 'deleted_at',
    nullable: true,
    comment: 'Thời điểm xóa mềm (Null nếu chưa bị xóa)',
  })
  deletedAt: Date | null;
}
