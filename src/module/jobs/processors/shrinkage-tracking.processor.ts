import { Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { EventEmitter2 } from '@nestjs/event-emitter';
import moment from 'moment';

import {
  SCHEDULER_QUEUE,
  JOB_SHRINKAGE_TRACKING,
} from '../../../shared/event.constants';
import { User } from '../../users/entities/user.entity';
import { StockMovement } from '../../stock/entities/stock.entity';
import { ReportService } from '../../reports/reports.service';

@Processor(SCHEDULER_QUEUE)
export class ShrinkageTrackingProcessor extends WorkerHost {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepo: Repository<StockMovement>,
    private readonly reportService: ReportService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_SHRINKAGE_TRACKING) return;
    this.logger.info('[ShrinkageTracking] Generating shrinkage report…');

    const startOfMonth = moment()
      .subtract(1, 'month')
      .startOf('month')
      .toDate();
    const endOfMonth = moment().subtract(1, 'month').endOf('month').toDate();

    const shrinkageData = await this.stockMovementRepo.find({
      where: {
        type: 'damage',
        createdAt: Between(startOfMonth, endOfMonth),
      },
      relations: ['variant', 'variant.product', 'branch', 'user'],
    });

    const report =
      await this.reportService.generateShrinkageReport(shrinkageData);
    const admins = await this.userRepo.find({ where: { role: 'admin' } });

    await this.eventEmitter.emitAsync('report.shrinkage', {
      report,
      recipients: admins,
    });

    this.logger.info('[ShrinkageTracking] ✅ Shrinkage report sent.');
  }
}
