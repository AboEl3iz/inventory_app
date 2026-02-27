import { Inject } from '@nestjs/common';

import { InventoryService } from 'src/module/inventory/inventory.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  PURCHASE_CANCELLED,
  PURCHASE_COMPLETED,
} from 'src/shared/event.constants';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import sendEmail from 'src/shared/mail/mailer';
@Processor('PURCHASES_QUEUE')
export class PuchaseListener extends WorkerHost {
  async process(job: Job, token?: string): Promise<any> {
    this.logger.info(`Processing purchase job ${job.id} of type ${job.name}`);
    if (job.name === PURCHASE_CANCELLED)
      return this.handlePurchaseCancelled(job.data);
    else if (job.name === PURCHASE_COMPLETED)
      return this.handlePurchaseCompleted(job.data);
    else {
      this.logger.warn(`Unknown job type ${job.name} for job ${job.id}`);
    }
  }
  constructor(
    private readonly inventoryService: InventoryService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {
    super();
  }
  /**
   * Handle purchase completion → Increase stock
   */
  async handlePurchaseCompleted(payload: {
    purchaseId: string;
    branchId: string;
    items: { variantId: string; quantity: number; unitCost?: number }[];
    user?: any;
  }) {
    this.logger.info(
      `📦 Purchase completed ${payload.purchaseId} → increasing stock`,
    );

    const errors: string[] = [];

    for (const it of payload.items) {
      try {
        await this.inventoryService.adjustStock(
          payload.branchId,
          it.variantId,
          it.quantity,
          payload.user,
        );
      } catch (err) {
        const msg = `❌ Error adjusting stock for variant ${it.variantId} on purchase ${payload.purchaseId}: ${err.message}`;
        this.logger.error(msg);
        errors.push(msg);
      }
    }

    // ✅ بعد تعديل المخزون، نرسل الإيميل لو فيه user
    if (payload.user?.email) {
      try {
        const totalCost = payload.items.reduce(
          (sum, i) => sum + (Number(i.unitCost) || 0) * i.quantity,
          0,
        );

        await sendEmail({
          to: payload.user.email,
          template: 'purchase',
          data: {
            purchaseId: payload.purchaseId,
            branchName: payload.user.branch?.name || 'Unknown Branch',
            user: payload.user,
            items: payload.items.map((i) => ({
              variantId: i.variantId,
              quantity: i.quantity,
              unitCost: Number(i.unitCost) || 0,
            })),
            totalCost,
          },
        });

        this.logger.info(
          `📨 Purchase completion email sent to ${payload.user.email}`,
        );
      } catch (emailErr) {
        this.logger.error(
          `❌ Failed to send purchase email: ${emailErr.message}`,
        );
      }
    }

    if (errors.length) {
      this.logger.warn(
        `⚠️ Some stock adjustments failed for purchase ${payload.purchaseId}`,
      );
    }
  }

  /**
   * Handle purchase cancellation → Decrease stock
   */
  async handlePurchaseCancelled(payload: {
    purchaseId: string;
    branchId: string;
    items: { variantId: string; quantity: number }[];
    user?: any;
  }) {
    this.logger.info(
      `📦 Purchase cancelled ${payload.purchaseId} → decreasing stock`,
    );

    const errors: string[] = [];

    for (const it of payload.items) {
      try {
        await this.inventoryService.adjustStock(
          payload.branchId,
          it.variantId,
          -it.quantity,
          payload.user,
        );
      } catch (err) {
        const msg = `❌ Error adjusting stock for variant ${it.variantId} on purchase cancellation ${payload.purchaseId}: ${err.message}`;
        this.logger.error(msg);
        errors.push(msg);
      }
    }

    // ✅ بعد تقليل الكميات، نرسل إيميل تنبيهي للمستخدم (لو عنده إيميل)
    if (payload.user?.email) {
      try {
        await sendEmail({
          to: payload.user.email,
          template: 'purchase-cancelled',
          data: {
            purchaseId: payload.purchaseId,
            branchName: payload.user.branch?.name || 'Unknown Branch',
            user: payload.user,
            items: payload.items,
          },
        });

        this.logger.info(
          `📨 Purchase cancellation email sent to ${payload.user.email}`,
        );
      } catch (emailErr) {
        this.logger.error(
          `❌ Failed to send purchase cancellation email: ${emailErr.message}`,
        );
      }
    }

    if (errors.length) {
      this.logger.warn(
        `⚠️ Some stock decrements failed for purchase ${payload.purchaseId}`,
      );
    }
  }
}
