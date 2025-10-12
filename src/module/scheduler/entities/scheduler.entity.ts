import { Entity, Column } from 'typeorm';
import { BaseEntity } from 'src/entities/base.entity';

@Entity('scheduler')
export class Scheduler extends BaseEntity {
  @Column()
  jobName: string;

  @Column()
  cronExpression: string;

  @Column({ default: true })
  isActive: boolean;
}
