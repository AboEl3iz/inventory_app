import { Inject } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { Logger as WinstonLogger } from 'winston';
import { InventoryService } from "src/module/inventory/inventory.service";
import { INVOICE_CREATED, LOW_STOCK, INVOICE_CANCELED } from "src/shared/event.constants";
import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job, Queue } from "bullmq";
@Processor('INVOICES_QUEUE')
export class InvoicesListener extends WorkerHost  {
    async process(job: Job, token?: string): Promise<any> {
        if (job.name === INVOICE_CREATED)
            return this.handleInvoiceCreated(job.data);
        else if (job.name === INVOICE_CANCELED)
            return this.handleInvoiceCanceled(job.data);
        else
            this.logger.error(`❌ Unknown job type ${job.name} in INVOICES_QUEUE`);
    }
    constructor(
        private readonly inventoryService: InventoryService,
        @Inject(WINSTON_MODULE_NEST_PROVIDER)
        private readonly logger: WinstonLogger,
        @InjectQueue('INVOICES_QUEUE') private readonly invoicesQueue: Queue,
    ) {
        super();
    }

    /**
       * Handle invoice creation → Decrease stock + trigger low stock alert
       */
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
                    this.invoicesQueue.add(LOW_STOCK, {
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
}