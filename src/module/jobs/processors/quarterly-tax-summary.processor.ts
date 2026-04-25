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
  JOB_QUARTERLY_TAX_SUMMARY,
} from '../../../shared/event.constants';
import { User } from '../../users/entities/user.entity';
import { ReportService } from '../../reports/reports.service';

@Processor(SCHEDULER_QUEUE)
export class QuarterlyTaxSummaryProcessor extends WorkerHost {
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
    if (job.name !== JOB_QUARTERLY_TAX_SUMMARY) return;

    this.logger.info('[QuarterlyTaxSummary] Generating quarterly tax summary…');

    const startOfQuarter = moment()
      .subtract(1, 'quarter')
      .startOf('quarter')
      .toDate();
    const endOfQuarter = moment()
      .subtract(1, 'quarter')
      .endOf('quarter')
      .toDate();

    const taxSummary = await this.reportService.generateTaxSummary(
      startOfQuarter,
      endOfQuarter,
    );

    const admins = await this.userRepo.find({ where: { role: 'admin' } });

    await this.eventEmitter.emitAsync('report.tax-summary', {
      summary: taxSummary,
      recipients: admins,
    });

    this.logger.info('[QuarterlyTaxSummary] ✅ Quarterly tax summary sent.');
  }
}
