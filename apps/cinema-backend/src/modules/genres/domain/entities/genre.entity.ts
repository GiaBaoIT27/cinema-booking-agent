import { Entity, Column, Index } from 'typeorm';
import { BaseIdentityEntity } from '#src/common/domain/base-identity.entity.js';
@Entity('genres')
export class Genre extends BaseIdentityEntity {
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
}
