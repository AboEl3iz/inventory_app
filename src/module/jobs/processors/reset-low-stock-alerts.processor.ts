import { Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import {
  SCHEDULER_QUEUE,
  JOB_RESET_LOW_STOCK_ALERTS,
} from '../../../shared/event.constants';
import { Inventory } from '../../inventory/entities/inventory.entity';

@Processor(SCHEDULER_QUEUE)
export class ResetLowStockAlertsProcessor extends WorkerHost {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_RESET_LOW_STOCK_ALERTS) return;

    this.logger.info('[ResetLowStockAlerts] Resetting low stock alert flags…');

    const result = await this.inventoryRepo.update(
      { lowStockAlertSent: true },
      { lowStockAlertSent: false },
    );

    this.logger.info(
      `[ResetLowStockAlerts] ✅ Reset ${result.affected ?? 0} record(s).`,
    );
  }
}
