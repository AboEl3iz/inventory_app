import { Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import moment from 'moment';

import {
  SCHEDULER_QUEUE,
  JOB_CLEANUP_SOFT_DELETED,
} from '../../../shared/event.constants';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { Purchase } from '../../purchases/entities/purchase.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';

@Processor(SCHEDULER_QUEUE)
export class CleanupSoftDeletedProcessor extends WorkerHost {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Purchase)
    private readonly purchaseRepo: Repository<Purchase>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_CLEANUP_SOFT_DELETED) return;

    this.logger.info(
      '[CleanupSoftDeleted] Hard-deleting old soft-deleted records…',
    );

    /**
     * Idempotency: records that are already hard-deleted simply won't
     * match the WHERE clause, so re-running is safe.
     */
    const deleteDate = moment().subtract(3, 'months').toDate();
    const repos = [this.invoiceRepo, this.purchaseRepo, this.variantRepo];

    let totalDeleted = 0;

    for (const repo of repos) {
      const result = await repo
        .createQueryBuilder()
        .delete()
        .where('deleted_at IS NOT NULL')
        .andWhere('deleted_at < :deleteDate', { deleteDate })
        .execute();

      totalDeleted += result.affected ?? 0;
    }

    this.logger.info(
      `[CleanupSoftDeleted] ✅ Permanently deleted ${totalDeleted} record(s).`,
    );
  }
}
