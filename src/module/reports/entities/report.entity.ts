import { Entity, Column } from 'typeorm';
import { BaseEntity } from 'src/entities/base.entity';

@Entity('reports')
export class Report extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'json', nullable: true })
  data: any;

  @Column()
  generatedBy: string;
}
