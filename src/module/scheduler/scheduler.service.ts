import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import {
  SCHEDULER_QUEUE,
  JOB_LOW_STOCK_CHECK,
  JOB_RESET_LOW_STOCK_ALERTS,
  JOB_GENERATE_REORDER_SUGGESTIONS,
  JOB_DAILY_SALES_REPORT,
  JOB_WEEKLY_REVENUE_REPORT,
  JOB_MONTHLY_PL_REPORT,
  JOB_QUARTERLY_TAX_SUMMARY,
  JOB_CLEANUP_SOFT_DELETED,
  JOB_DAILY_SALES_TARGETS,
  JOB_EMPLOYEE_PERFORMANCE,
  JOB_SHRINKAGE_TRACKING,
} from '../../shared/event.constants';

/**
 * Repeatable job definitions.
 * Each entry maps a job name (also used as jobId for idempotency) to a
 * standard cron expression.  BullMQ stores the schedule in Redis — no
 * in-memory cron, no duplication across pods.
 */
const REPEATABLE_JOBS: Array<{
  name: string;
  cron: string;
  description: string;
}> = [
  {
    name: JOB_LOW_STOCK_CHECK,
    cron: '0 * * * *', // every hour
    description: 'Low stock check',
  },
  {
    name: JOB_RESET_LOW_STOCK_ALERTS,
    cron: '0 0 * * *', // daily at midnight
    description: 'Reset low stock alert flags',
  },
  {
    name: JOB_GENERATE_REORDER_SUGGESTIONS,
    cron: '0 0 * * 0', // weekly on Sunday
    description: 'Generate reorder suggestions',
  },
  {
    name: JOB_DAILY_SALES_REPORT,
    cron: '55 23 * * *', // 23:55 daily
    description: 'End-of-day sales report',
  },
  {
    name: JOB_WEEKLY_REVENUE_REPORT,
    cron: '0 9 * * 1', // Monday 09:00
    description: 'Weekly revenue report',
  },
  {
    name: JOB_MONTHLY_PL_REPORT,
    cron: '0 10 1 * *', // 1st of each month 10:00
    description: 'Monthly P&L report',
  },
  {
    name: JOB_QUARTERLY_TAX_SUMMARY,
    cron: '0 11 1 1,4,7,10 *', // 1st of Jan/Apr/Jul/Oct 11:00
    description: 'Quarterly tax summary',
  },
  {
    name: JOB_CLEANUP_SOFT_DELETED,
    cron: '0 3 15 * *', // 15th of each month 03:00
    description: 'Hard-delete old soft-deleted records',
  },
  {
    name: JOB_DAILY_SALES_TARGETS,
    cron: '0 18 * * *', // daily at 18:00
    description: 'Daily sales target check',
  },
  {
    name: JOB_EMPLOYEE_PERFORMANCE,
    cron: '0 8 * * 1', // Monday 08:00
    description: 'Employee performance summary',
  },
  {
    name: JOB_SHRINKAGE_TRACKING,
    cron: '0 9 5 * *', // 5th of each month 09:00
    description: 'Shrinkage tracking report',
  },
];

@Injectable()
export class SchedulerService implements OnModuleInit {
  constructor(
    @InjectQueue(SCHEDULER_QUEUE)
    private readonly schedulerQueue: Queue,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  /**
   * Called automatically when the scheduler pod starts.
   * Upserts every repeatable job into Redis using a deterministic jobId.
   *
   * BullMQ de-duplicates by (name + repeat.pattern + jobId): re-running
   * this method on pod restart produces zero duplicate schedules.
   */
  async onModuleInit(): Promise<void> {
    await this.registerRepeatableJobs();
  }

  async registerRepeatableJobs(): Promise<void> {
    this.logger.info(
      `[Scheduler] Registering ${REPEATABLE_JOBS.length} repeatable jobs in Redis…`,
    );

    for (const job of REPEATABLE_JOBS) {
      try {
        await this.schedulerQueue.add(
          job.name,
          {}, // payload — processors receive the job.name and build their own context
          {
            repeat: { pattern: job.cron },
            jobId: `repeatable:${job.name}`, // ← deterministic — prevents duplicates
            removeOnComplete: { count: 10 },
            removeOnFail: { count: 20 },
          },
        );

        this.logger.info(
          `[Scheduler] ✅ Registered: "${job.description}" (${job.cron})`,
        );
      } catch (err) {
        this.logger.error(
          `[Scheduler] ❌ Failed to register "${job.name}": ${err.message}`,
        );
      }
    }

    this.logger.info('[Scheduler] All repeatable jobs registered.');
  }

  /**
   * Lists all active repeatable jobs in Redis.
   * Useful for admin endpoints / health checks.
   */
  async getRepeatableJobs() {
    return this.schedulerQueue.getRepeatableJobs();
  }

  /**
   * Removes a repeatable job from Redis by name.
   * The next time the scheduler pod restarts it will be re-registered.
   */
  async removeRepeatableJob(jobName: string): Promise<void> {
    const jobs = await this.schedulerQueue.getRepeatableJobs();
    const target = jobs.find((j) => j.name === jobName);
    if (!target) {
      this.logger.warn(`[Scheduler] Job "${jobName}" not found in Redis`);
      return;
    }
    await this.schedulerQueue.removeRepeatableByKey(target.key);
    this.logger.info(`[Scheduler] Removed repeatable job: "${jobName}"`);
  }
}
