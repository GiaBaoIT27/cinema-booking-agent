import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('genres')
export class Genre {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: string;

  @Index('idx_genres_code_unique', { unique: true })
  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    nullable: false,
    name: 'code',
  })
  code: string;

  @Index('idx_genres_name_unique', { unique: true })
  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    nullable: false,
    name: 'name',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'description',
  })
  description: string | null;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at',
  })
  createdAt: Date;
}
