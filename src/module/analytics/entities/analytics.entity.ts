import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../entities/base.entity';
@Entity('analytics')
export class Analytics extends BaseEntity {
  @Column()
  metric: string;

  @Column({ type: 'float' })
  value: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  recordedAt: Date;
}

