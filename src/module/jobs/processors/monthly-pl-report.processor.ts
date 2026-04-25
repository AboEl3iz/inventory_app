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
  JOB_MONTHLY_PL_REPORT,
} from '../../../shared/event.constants';
import { User } from '../../users/entities/user.entity';
import { ReportService } from '../../reports/reports.service';

@Processor(SCHEDULER_QUEUE)
export class MonthlyPlReportProcessor extends WorkerHost {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly reportService: ReportService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_MONTHLY_PL_REPORT) return;

    this.logger.info('[MonthlyPlReport] Generating monthly P&L report…');

    const startOfMonth = moment()
      .subtract(1, 'month')
      .startOf('month')
      .toDate();
    const endOfMonth = moment().subtract(1, 'month').endOf('month').toDate();

    const report = await this.reportService.generateProfitLossReport(
      startOfMonth,
      endOfMonth,
    );

    const admins = await this.userRepo.find({ where: { role: 'admin' } });

    await this.eventEmitter.emitAsync('report.monthly-pl', {
      report,
      recipients: admins,
    });

    this.logger.info('[MonthlyPlReport] ✅ Monthly P&L sent.');
  }
}
