import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InventoryService } from 'src/module/inventory/inventory.service';
import {
  PURCHASE_COMPLETED,
  INVOICE_CREATED,
  LOW_STOCK,
  INVOICE_CANCELED,
} from 'src/shared/event.constants';
import { Logger } from 'winston';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
@Processor('LOW_STOCK_QUEUE')
export class StockListener extends WorkerHost {
  async process(job: Job, token?: string): Promise<any> {
    return this.handleLowStock(job.data);
  }
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly emitter: EventEmitter2,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
  ) {
    super();
  }

  /**
   * Handle low stock → notify via logs / notifications
   */
  async handleLowStock(payload: {
    branchId: string;
    variantId: string;
    quantity: number;
  }) {
    this.logger.warn(
      `⚠️ Low stock detected for variant ${payload.variantId} at branch ${payload.branchId} (qty=${payload.quantity})`,
    );

    // Future: integrate notification service or WebSocket
    // this.notificationService.sendLowStockAlert(payload);
  }
}
