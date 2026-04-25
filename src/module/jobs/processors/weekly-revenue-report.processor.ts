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
  JOB_WEEKLY_REVENUE_REPORT,
} from '../../../shared/event.constants';
import { User } from '../../users/entities/user.entity';
import { ReportService } from '../../reports/reports.service';

@Processor(SCHEDULER_QUEUE)
export class WeeklyRevenueReportProcessor extends WorkerHost {
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
    if (job.name !== JOB_WEEKLY_REVENUE_REPORT) return;

    this.logger.info('[WeeklyRevenueReport] Generating weekly revenue report…');

    const startOfWeek = moment().subtract(1, 'week').startOf('week').toDate();
    const endOfWeek = moment().subtract(1, 'week').endOf('week').toDate();

    const report = await this.reportService.generateWeeklyReport(
      startOfWeek,
      endOfWeek,
    );

    const admins = await this.userRepo.find({ where: { role: 'admin' } });

    await this.eventEmitter.emitAsync('report.weekly-sales', {
      report,
      recipients: admins,
    });

    this.logger.info('[WeeklyRevenueReport] ✅ Weekly report sent.');
  }
}
