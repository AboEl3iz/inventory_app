import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { InventoryService } from "src/module/inventory/inventory.service";
import { PURCHASE_COMPLETED, INVOICE_CREATED, LOW_STOCK, INVOICE_CANCELED } from "src/shared/event.constants";
import { Logger } from "winston";
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';
@Injectable()
export class StockListener {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly emitter: EventEmitter2,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
  ) {}

  /**
   * Handle purchase completion → Increase stock
   */
  @OnEvent(PURCHASE_COMPLETED)
  async handlePurchaseCompleted(payload: {
    purchaseId: string;
    branchId: string;
    items: { variantId: string; qty: number }[];
    user?: any;
  }) {
    this.logger.info(`📦 Purchase completed ${payload.purchaseId} → increasing stock`);
    for (const it of payload.items) {
      try {
        await this.inventoryService.adjustStock(
          payload.branchId,
          it.variantId,
          it.qty,
          payload.user,
        );
      } catch (err) {
        this.logger.error(
          `❌ Error adjusting stock for variant ${it.variantId} on purchase ${payload.purchaseId}: ${err.message}`,
        );
      }
    }
  }

  /**
   * Handle invoice creation → Decrease stock + trigger low stock alert
   */
  @OnEvent(INVOICE_CREATED)
  async handleInvoiceCreated(payload: {
    invoiceId: string;
    branchId: string;
    items: { variantId: string; qty: number }[];
    user?: any;
  }) {
    this.logger.info(`🧾 Invoice created ${payload.invoiceId} → decreasing stock`);
    for (const it of payload.items) {
      try {
        await this.inventoryService.adjustStock(
          payload.branchId,
          it.variantId,
          -it.qty,
          payload.user,
        );

        // Check if variant is now below threshold
        const inv = await this.inventoryService.findOneByVarientAndBranch(
          it.variantId,
          payload.branchId,
        );
        if (inv && inv.quantity <= inv.minThreshold) {
          this.emitter.emit(LOW_STOCK, {
            branchId: payload.branchId,
            variantId: it.variantId,
            quantity: inv.quantity,
          });
        }
      } catch (err) {
        this.logger.error(
          `❌ Error updating stock for variant ${it.variantId} during invoice ${payload.invoiceId}: ${err.message}`,
        );
      }
    }
  }

  /**
   * Handle invoice cancellation → Restore stock
   */
  @OnEvent(INVOICE_CANCELED)
  async handleInvoiceCanceled(payload: {
    branchId: string;
    items: { variantId: string; qty: number }[];
    user?: any;
  }) {
    this.logger.info(`↩️ Invoice canceled → restoring stock for branch ${payload.branchId}`);
    for (const it of payload.items) {
      try {
        await this.inventoryService.adjustStock(
          payload.branchId,
          it.variantId,
          it.qty,
          payload.user,
        );
      } catch (err) {
        this.logger.error(
          `❌ Error restoring stock for variant ${it.variantId}: ${err.message}`,
        );
      }
    }
  }

  /**
   * Handle low stock → notify via logs / notifications
   */
  @OnEvent(LOW_STOCK)
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