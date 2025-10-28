import { Inject } from "@nestjs/common";
import { Logger as WinstonLogger } from 'winston';
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { InventoryService } from "src/module/inventory/inventory.service";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

@Processor('PURCHASES_QUEUE')
export class PuchaseListener extends WorkerHost {
    async process(job: Job, token?: string): Promise<any> {
        return this.handlePurchaseCompleted(job.data);
    }
    constructor(
        private readonly inventoryService: InventoryService,
        @Inject(WINSTON_MODULE_NEST_PROVIDER)
        private readonly logger: WinstonLogger,
    ) {
        super();
    }
    /**
  * Handle purchase completion → Increase stock
  */
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
}