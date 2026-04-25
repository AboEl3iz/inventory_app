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
  JOB_EMPLOYEE_PERFORMANCE,
} from '../../../shared/event.constants';
import { User } from '../../users/entities/user.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';

@Processor(SCHEDULER_QUEUE)
export class EmployeePerformanceProcessor extends WorkerHost {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_EMPLOYEE_PERFORMANCE) return;
    this.logger.info('[EmployeePerformance] Generating performance summary…');

    const startOfWeek = moment().subtract(1, 'week').startOf('week').toDate();
    const endOfWeek = moment().subtract(1, 'week').endOf('week').toDate();

    const cashiers = await this.userRepo.find({
      where: { role: 'cashier' },
      relations: ['branch'],
    });

    const performanceData = await Promise.all(
      cashiers.map((user) =>
        this.calculateUserPerformance(user, startOfWeek, endOfWeek),
      ),
    );

    const managers = await this.userRepo.find({ where: { role: 'manager' } });
    const admins = await this.userRepo.find({ where: { role: 'admin' } });

    await this.eventEmitter.emitAsync('report.employee-performance', {
      performanceData,
      recipients: [...managers, ...admins],
    });

    this.logger.info('[EmployeePerformance] ✅ Performance summary sent.');
  }

  private async calculateUserPerformance(
    user: User,
    startDate: Date,
    endDate: Date,
  ) {
    const result = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .select('SUM(invoice.totalAmount)', 'totalSales')
      .addSelect('COUNT(invoice.id)', 'totalOrders')
      .where('invoice.userId = :userId', { userId: user.id })
      .andWhere('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' })
      .getRawOne();

    const totalSales = Number(result?.totalSales || 0);
    const totalOrders = Number(result?.totalOrders || 0);

    return {
      user,
      totalSales,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
      period: { start: startDate, end: endDate },
    };
  }
}
