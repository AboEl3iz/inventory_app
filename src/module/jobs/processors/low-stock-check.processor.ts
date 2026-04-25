import { Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  SCHEDULER_QUEUE,
  JOB_LOW_STOCK_CHECK,
} from '../../../shared/event.constants';
import { Inventory } from '../../inventory/entities/inventory.entity';

@Processor(SCHEDULER_QUEUE)
export class LowStockCheckProcessor extends WorkerHost {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_LOW_STOCK_CHECK) return;

    this.logger.info('[LowStockCheck] Starting low stock check…');

    const lowStockItems = await this.inventoryRepo
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .leftJoinAndSelect('inventory.branch', 'branch')
      .where('inventory.quantity < inventory.minThreshold')
      .getMany();

    for (const item of lowStockItems) {
      // Idempotent: emitting an event — downstream listeners handle dedup
      await this.eventEmitter.emitAsync('inventory.low-stock', {
        variantSku: item.variant.sku,
        productName: item.variant.product.name,
        branchName: item.branch.name,
        currentStock: item.quantity,
        minThreshold: item.minThreshold,
        reorderSuggestion: this.calculateReorderQuantity(item),
      });

      item.lowStockAlertSent = true;
      item.lastAlertSentAt = new Date();
      await this.inventoryRepo.save(item);
    }

    this.logger.info(
      `[LowStockCheck] ✅ Done — ${lowStockItems.length} alert(s) emitted.`,
    );
  }

  private calculateReorderQuantity(inventory: Inventory): number {
    const safetyStock = inventory.minThreshold * 2;
    return Math.max(safetyStock - inventory.quantity, 0);
  }
}
