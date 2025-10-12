import { Entity, Column } from 'typeorm';
import { BaseEntity } from 'src/entities/base.entity';

@Entity('events')
export class Event extends BaseEntity {
  @Column()
  title: string;

  @Column()
  description: string;

  @Column({ type: 'timestamp' })
  eventDate: Date;

  @Column()
  createdBy: string;
}
