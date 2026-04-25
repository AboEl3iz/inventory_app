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
  JOB_DAILY_SALES_REPORT,
} from '../../../shared/event.constants';
import { Branch } from '../../branches/entities/branch.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { User } from '../../users/entities/user.entity';

@Processor(SCHEDULER_QUEUE)
export class DailySalesReportProcessor extends WorkerHost {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_DAILY_SALES_REPORT) return;

    this.logger.info('[DailySalesReport] Generating end-of-day sales report…');

    const today = moment().startOf('day').toDate();
    const endOfDay = moment().endOf('day').toDate();

    const branches = await this.branchRepo.find({ where: { isActive: true } });

    for (const branch of branches) {
      const report = await this.generateDailySalesReport(
        branch,
        today,
        endOfDay,
      );

      const recipients = await this.userRepo.find({
        where: [
          { branch: { id: branch.id }, role: 'manager' },
          { role: 'admin' },
        ],
      });

      await this.eventEmitter.emitAsync('report.daily-sales', {
        report,
        recipients,
      });
    }

    this.logger.info(
      `[DailySalesReport] ✅ Reports sent for ${branches.length} branch(es).`,
    );
  }

  private async generateDailySalesReport(
    branch: Branch,
    startDate: Date,
    endDate: Date,
  ) {
    const result = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .select('SUM(invoice.totalAmount)', 'totalRevenue')
      .addSelect('COUNT(invoice.id)', 'totalOrders')
      .where('invoice.branchId = :branchId', { branchId: branch.id })
      .andWhere('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' })
      .getRawOne();

    const totalRevenue = Number(result?.totalRevenue || 0);
    const totalOrders = Number(result?.totalOrders || 0);

    return {
      branch,
      date: moment(startDate).format('YYYY-MM-DD'),
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    };
  }
}
