import { Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { EventEmitter2 } from '@nestjs/event-emitter';
import moment from 'moment';

import {
  SCHEDULER_QUEUE,
  JOB_DAILY_SALES_TARGETS,
} from '../../../shared/event.constants';
import { Branch } from '../../branches/entities/branch.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';

@Processor(SCHEDULER_QUEUE)
export class DailySalesTargetsProcessor extends WorkerHost {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_DAILY_SALES_TARGETS) return;
    this.logger.info('[DailySalesTargets] Checking daily sales targets…');

    const branches = await this.branchRepo.find({ where: { isActive: true } });

    for (const branch of branches) {
      const todaySales = await this.calculateDailySales(branch);
      const target = 10_000; // Replace with DB-driven target

      if (todaySales < target * 0.8) {
        await this.eventEmitter.emitAsync('alert.sales-target', {
          branch,
          actualSales: todaySales,
          target,
          percentage: (todaySales / target) * 100,
        });
      }
    }

    this.logger.info('[DailySalesTargets] ✅ Complete.');
  }

  private async calculateDailySales(branch: Branch): Promise<number> {
    const today = moment().startOf('day').toDate();
    const endOfDay = moment().endOf('day').toDate();

    const result = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .select('SUM(invoice.totalAmount)', 'total')
      .where('invoice.branchId = :branchId', { branchId: branch.id })
      .andWhere('invoice.createdAt BETWEEN :start AND :end', {
        start: today,
        end: endOfDay,
      })
      .andWhere('invoice.status = :status', { status: 'paid' })
      .getRawOne();

    return Number(result?.total || 0);
  }
}
