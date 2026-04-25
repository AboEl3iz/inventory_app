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
  JOB_GENERATE_REORDER_SUGGESTIONS,
} from '../../../shared/event.constants';
import { Inventory } from '../../inventory/entities/inventory.entity';

@Processor(SCHEDULER_QUEUE)
export class GenerateReorderSuggestionsProcessor extends WorkerHost {
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
    if (job.name !== JOB_GENERATE_REORDER_SUGGESTIONS) return;

    this.logger.info('[ReorderSuggestions] Generating reorder suggestions…');

    const lowStockItems = await this.inventoryRepo
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .leftJoinAndSelect('inventory.branch', 'branch')
      .where('inventory.quantity < inventory.minThreshold')
      .getMany();

    const supplierGroups = this.groupBySupplier(lowStockItems);

    for (const [, items] of Object.entries(supplierGroups)) {
      const purchaseOrder = {
        supplier: items[0].variant.product.supplier,
        items: items.map((item) => ({
          variant: item.variant,
          suggestedQuantity: this.calculateReorderQuantity(item),
          currentStock: item.quantity,
          minThreshold: item.minThreshold,
          branch: item.branch,
        })),
        totalEstimatedCost: this.calculateTotalCost(items),
      };

      await this.eventEmitter.emitAsync(
        'inventory.reorder-suggestion',
        purchaseOrder,
      );
    }

    this.logger.info(
      `[ReorderSuggestions] ✅ ${Object.keys(supplierGroups).length} supplier group(s) processed.`,
    );
  }

  private calculateReorderQuantity(inventory: Inventory): number {
    return Math.max(inventory.minThreshold * 2 - inventory.quantity, 0);
  }

  private groupBySupplier(items: Inventory[]): Record<string, Inventory[]> {
    return items.reduce(
      (acc, item) => {
        const supplierId = item.variant.product.supplier.id;
        acc[supplierId] ??= [];
        acc[supplierId].push(item);
        return acc;
      },
      {} as Record<string, Inventory[]>,
    );
  }

  private calculateTotalCost(items: Inventory[]): number {
    return items.reduce((total, item) => {
      return (
        total + this.calculateReorderQuantity(item) * item.variant.costPrice
      );
    }, 0);
  }
}
