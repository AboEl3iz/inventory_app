import { Inject } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { InventoryService } from "src/module/inventory/inventory.service";
import { INVOICE_CREATED, LOW_STOCK, INVOICE_CANCELED } from "src/shared/event.constants";
import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job, Queue } from "bullmq";
import sendEmail from "src/shared/mail/mailer";
import { InjectRepository } from "@nestjs/typeorm";
import { ProductVariant } from "src/module/products/entities/product-variant.entity";
import { In, Repository } from "typeorm";
import { Role } from "src/common/decorator/roles.decorator";
@Processor('INVOICES_QUEUE')
export class InvoicesListener extends WorkerHost  {
    async process(job: Job, token?: string): Promise<any> {
        if (job.name === INVOICE_CREATED)
            return this.handleInvoiceCreated(job.data);
        else if (job.name === INVOICE_CANCELED)
            return this.handleInvoiceCancelled(job.data);
        else
            this.logger.error(`❌ Unknown job type ${job.name} in INVOICES_QUEUE`);
    }
    constructor(
        private readonly inventoryService: InventoryService,
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger,
        @InjectQueue('INVOICES_QUEUE') private readonly invoicesQueue: Queue,
         @InjectRepository(ProductVariant)
        private readonly variantRepo: Repository<ProductVariant>,
    ) {
        super();
    }
/**
     * 🧮 Handle invoice creation → Decrease stock
     */
    async handleInvoiceCreated(payload: {
        invoiceId: string;
        branchId: string;
        items: { variantId: string; quantity: number; unitPrice?: number; discount?: number }[];
        invoiceDiscount?: number;
        invoiceTax?: number;
        invoiceSubtotal?: number;
        invoiceTotalAmount?: number;
        user?: any;
        customer?: { email?: string; name?: string };
    }) {
        this.logger.info(`💰 Invoice created ${payload.invoiceId} → decreasing stock`);

        const errors: string[] = [];

        // ✅ Create system context for internal stock adjustment
        // This bypasses user permission checks since the invoice was already validated
        const systemContext = {
            id: payload.user?.id,
            branchId: payload.branchId, // The branch where the invoice was created
            role: payload.user?.role || 'cashier', // Keep the actual user role
            isSystemOperation: true, // Flag to bypass branch access checks
        };

        for (const it of payload.items) {
            try {
                await this.inventoryService.adjustStock(
                    payload.branchId,
                    it.variantId,
                    -it.quantity,
                    systemContext, // Pass system context
                );
            } catch (err) {
                const msg = `❌ Error decreasing stock for variant ${it.variantId} on invoice ${payload.invoiceId}: ${err.message}`;
                this.logger.error(msg);
                errors.push(msg);
            }
        }

        // ✅ Fetch variant details for email
        if (payload.customer?.email) {
            try {
                const variantIds = payload.items.map(i => i.variantId);
                
                // ✅ Fix: Use In() with proper array
                const variants = await this.variantRepo.find({
                    where: { id: In(variantIds) }, // In() expects array, not string
                    relations: ['product', 'values', 'values.attributeValue', 'values.attributeValue.attribute'],
                });

                const variantMap = new Map(variants.map(v => [v.id, v]));

                const enrichedItems = payload.items.map(item => {
                    const variant = variantMap.get(item.variantId);
                    if (!variant) {
                        return {
                            productName: 'Unknown Product',
                            brand: '',
                            attributes: '',
                            quantity: item.quantity,
                            unitPrice: Number(item.unitPrice) || 0,
                            discount: Number(item.discount) || 0,
                            subtotal: (Number(item.unitPrice) || 0) * item.quantity,
                            netPrice: ((Number(item.unitPrice) || 0) * item.quantity) - (Number(item.discount) || 0),
                        };
                    }

                    // Build attribute string (e.g., "Black, 12GB RAM")
                    const attributes = variant.values
                        ?.map(v => v.attributeValue?.value)
                        .filter(Boolean)
                        .join(', ') || '';

                    const subtotal = (Number(item.unitPrice) || 0) * item.quantity;
                    const discount = Number(item.discount) || 0;
                    const netPrice = subtotal - discount;

                    return {
                        productName: variant.product?.name || 'Unknown',
                        brand: variant.product?.brand || '',
                        attributes,
                        quantity: item.quantity,
                        unitPrice: Number(item.unitPrice) || 0,
                        discount,
                        subtotal,
                        netPrice,
                    };
                });

                // ✅ Calculate totals including invoice-level discount and tax
                const itemsTotal = enrichedItems.reduce((sum, i) => sum + i.netPrice, 0);
                const invoiceDiscount = Number(payload.invoiceDiscount) || 0;
                const invoiceTax = Number(payload.invoiceTax) || 0;
                const finalTotal = payload.invoiceTotalAmount || (itemsTotal - invoiceDiscount + invoiceTax);

                await sendEmail({
                    to: payload.customer.email,
                    template: 'invoices',
                    data: {
                        invoiceId: payload.invoiceId,
                        branchName: payload.user?.branch?.name || 'Unknown Branch',
                        customer: payload.customer,
                        items: enrichedItems,
                        subtotal: payload.invoiceSubtotal || itemsTotal,
                        invoiceDiscount,
                        tax: invoiceTax,
                        totalAmount: finalTotal,
                    },
                });

                this.logger.info(`📨 Invoice creation email sent to ${payload.customer.email}`);
            } catch (emailErr) {
                this.logger.error(`❌ Failed to send invoice email: ${emailErr.message}`);
            }
        }

        if (errors.length) {
            this.logger.warn(`⚠️ Some stock adjustments failed for invoice ${payload.invoiceId}`);
        }
    }
/**
     * ❌ Handle invoice cancellation → Increase stock
     */
    async handleInvoiceCancelled(payload: {
        invoiceId: string;
        branchId: string;
        items: { variantId: string; quantity: number }[];
        user?: any;
        customer?: { email?: string; name?: string };
    }) {
        this.logger.info(`🧾 Invoice cancelled ${payload.invoiceId} → increasing stock`);

        const errors: string[] = [];

        // ✅ Create system context for stock restoration
        const systemContext = {
            id: payload.user?.id,
            branchId: payload.branchId,
            role: payload.user?.role || 'cashier',
            isSystemOperation: true, // Flag to bypass branch access checks
        };

        for (const it of payload.items) {
            try {
                await this.inventoryService.adjustStock(
                    payload.branchId,
                    it.variantId,
                    it.quantity,
                    systemContext, // Pass system context
                );
            } catch (err) {
                const msg = `❌ Error increasing stock for variant ${it.variantId} on invoice cancellation ${payload.invoiceId}: ${err.message}`;
                this.logger.error(msg);
                errors.push(msg);
            }
        }

        // ✅ Fetch variant details for cancellation email
        if (payload.customer?.email) {
            try {
                const variantIds = payload.items.map(i => i.variantId);
                
                const variants = await this.variantRepo.find({
                    where: { id: In(variantIds) },
                    relations: ['product', 'values', 'values.attributeValue', 'values.attributeValue.attribute'],
                });

                const variantMap = new Map(variants.map(v => [v.id, v]));

                const enrichedItems = payload.items.map(item => {
                    const variant = variantMap.get(item.variantId);
                    if (!variant) {
                        return {
                            productName: 'Unknown Product',
                            brand: '',
                            attributes: '',
                            quantity: item.quantity,
                            variantId: item.variantId,
                        };
                    }

                    const attributes = variant.values
                        ?.map(v => v.attributeValue?.value)
                        .filter(Boolean)
                        .join(', ') || '';

                    return {
                        productName: variant.product?.name || 'Unknown',
                        brand: variant.product?.brand || '',
                        attributes,
                        quantity: item.quantity,
                        variantId: item.variantId,
                    };
                });

                await sendEmail({
                    to: payload.customer.email,
                    template: 'invoices-cancelled',
                    data: {
                        invoiceId: payload.invoiceId,
                        branchName: payload.user?.branch?.name || 'Unknown Branch',
                        customer: payload.customer,
                        items: enrichedItems,
                    },
                });

                this.logger.info(`📨 Invoice cancellation email sent to ${payload.customer.email}`);
            } catch (emailErr) {
                this.logger.error(`❌ Failed to send invoice cancellation email: ${emailErr.message}`);
            }
        }

        if (errors.length) {
            this.logger.warn(`⚠️ Some stock increments failed for invoice ${payload.invoiceId}`);
        }
    }
}