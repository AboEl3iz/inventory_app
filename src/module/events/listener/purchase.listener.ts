import { Inject } from "@nestjs/common";

import { InventoryService } from "src/module/inventory/inventory.service";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PURCHASE_CANCELLED , PURCHASE_COMPLETED } from "src/shared/event.constants";
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
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
        items: { variantId: string; quantity: number }[];
        user?: any;
    }) {
        this.logger.info(`📦 Purchase completed ${payload.purchaseId} → increasing stock`);
        for (const it of payload.items) {
            try {
                //{"purchaseId":"f734173f-f752-460c-b2ec-c500e7175aa8","branchId":"863c69a7-5166-4dad-ab79-cec961aaf34e","items":[{"variantId":"1c1386c1-a74d-4ad0-8b6d-6b94b76a3e07","quantity":3,"unitCost":"2000.00"}]}
                await this.inventoryService.adjustStock(
                    payload.branchId,
                    it.variantId,
                    it.quantity,
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
     * Handle purchase cancellation → Decrease stock
     */
    async handlePurchaseCancelled(payload: {
        purchaseId: string;
        branchId: string;
        items: { variantId: string; quantity: number }[];
        user?: any;
    }) {
        this.logger.info(`📦 Purchase cancelled ${payload.purchaseId} → decreasing stock`)
        for (const it of payload.items) {
            try {
                await this.inventoryService.adjustStock(
                    payload.branchId,
                    it.variantId,
                    -it.quantity,
                    payload.user,
                );
            } catch (err) {
                this.logger.error(
                    `❌ Error adjusting stock for variant ${it.variantId} on purchase cancellation ${payload.purchaseId}: ${err.message}`,
                );
            }
        }
    }
}