import { InjectQueue } from "@nestjs/bullmq";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import { Queue } from "bullmq";
import { WINSTON_MODULE_NEST_PROVIDER, WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
// ==================== EMAIL QUEUE PRODUCER ====================
@Injectable()
export class NotificationService {

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
              private readonly logger: Logger,
    @InjectQueue("EMAIL_QUEUE") private emailQueue: Queue,
    private configService: ConfigService,
  ) {}

  // ==================== LOW STOCK ALERTS ====================

  @OnEvent('inventory.low-stock')
  async handleLowStockAlert(data: {
    variantSku: string;
    productName: string;
    branchName: string;
    currentStock: number;
    minThreshold: number;
    reorderSuggestion: number;
  }) {
    this.logger.info(`Queuing low stock alert for ${data.productName}`);

    await this.emailQueue.add(
      'send-email',
      {
        to: await this.getAdminEmails(),
        template: 'low-stock-alert',
        data: {
          productName: data.productName,
          variantSku: data.variantSku,
          branchName: data.branchName,
          currentStock: data.currentStock,
          minThreshold: data.minThreshold,
          reorderSuggestion: data.reorderSuggestion,
        },
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
  }

  @OnEvent('inventory.reorder-suggestion')
  async handlePurchaseOrderSuggestion(purchaseOrder: any) {
    this.logger.info(`Queuing purchase order suggestion for ${purchaseOrder.supplier.name}`);

    await this.emailQueue.add(
      'send-email',
      {
        to: await this.getAdminEmails(),
        template: 'purchase-order-suggestion',
        data: {
          supplierName: purchaseOrder.supplier.name,
          items: purchaseOrder.items,
          totalEstimatedCost: purchaseOrder.totalEstimatedCost,
        },
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
  }

  // ==================== FINANCIAL REPORTS ====================

  @OnEvent('report.daily-sales')
  async handleDailySalesReport(payload: { report: any; recipients: any[] }) {
    this.logger.info(`Queuing daily sales report for ${payload.report.branch.name}`);

    const emails = payload.recipients.map(r => r.email);

    await this.emailQueue.add(
      'send-email',
      {
        to: emails,
        template: 'daily-sales-report',
        data: {
          branchName: payload.report.branch.name,
          date: payload.report.date,
          totalRevenue: payload.report.totalRevenue,
          totalOrders: payload.report.totalOrders,
          averageOrderValue: payload.report.averageOrderValue,
        },
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
  }

  @OnEvent('report.weekly-sales')
  async handleWeeklyReport(payload: { report: any; recipients: any[] }) {
    this.logger.info('Queuing weekly sales report');

    const emails = payload.recipients.map(r => r.email);

    await this.emailQueue.add(
      'send-email',
      {
        to: emails,
        template: 'weekly-sales-report',
        data: {
          weekStart: payload.report.weekStart,
          weekEnd: payload.report.weekEnd,
          totalRevenue: payload.report.totalRevenue,
          totalOrders: payload.report.totalOrders,
          averageOrderValue: payload.report.averageOrderValue,
          revenueGrowth: payload.report.revenueGrowth,
          ordersGrowth: payload.report.ordersGrowth,
          topProducts: payload.report.topProducts,
        },
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
  }

  @OnEvent('report.monthly-pl')
  async handleMonthlyPLReport(payload: { report: any; recipients: any[] }) {
    this.logger.info('Queuing monthly P&L report');
this.logger.info(
        `
        admins accounts ${
          payload.recipients.map(e=>{
            return e.email
          })
        }
        `
      )
    const emails = payload.recipients.map(r => r.email);

    await this.emailQueue.add(
      'send-email',
      {
        to: emails,
        template: 'monthly-pl-report',
        data: {
          month: payload.report.month,
          totalRevenue: payload.report.totalRevenue,
          cogs: payload.report.cogs,
          grossProfit: payload.report.grossProfit,
          operatingExpenses: payload.report.operatingExpenses,
          netProfit: payload.report.netProfit,
          profitMargin: payload.report.profitMargin,
        },
      },
      
    );
  }

  @OnEvent('report.tax-summary')
  async handleTaxSummary(payload: { summary: any; recipients: any[] }) {
    this.logger.info('Queuing quarterly tax summary');

    const emails = payload.recipients.map(r => r.email);

    await this.emailQueue.add(
      'send-email',
      {
        to: emails,
        template: 'tax-summary',
        data: {
          quarter: payload.summary.quarter,
          year: payload.summary.year,
          totalSales: payload.summary.totalSales,
          taxableAmount: payload.summary.taxableAmount,
          taxRate: payload.summary.taxRate,
          totalTaxCollected: payload.summary.totalTaxCollected,
        },
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
  }

  // ==================== PERFORMANCE ALERTS ====================

  @OnEvent('alert.sales-target')
  async handleSalesTargetAlert(data: any) {
    this.logger.info(`Queuing sales target alert for ${data.branch.name}`);

    await this.emailQueue.add(
      'send-email',
      {
        to: await this.getAdminEmails(),
        template: 'sales-target-alert',
        data: {
          branchName: data.branch.name,
          target: data.target,
          actualSales: data.actualSales,
          percentage: data.percentage,
        },
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
  }

  @OnEvent('report.employee-performance')
  async handlePerformanceSummary(payload: { performanceData: any[]; recipients: any[] }) {
    this.logger.info('Queuing employee performance summary');

    const emails = payload.recipients.map(r => r.email);

    await this.emailQueue.add(
      'send-email',
      {
        to: emails,
        template: 'employee-performance',
        data: {
          performanceData: payload.performanceData.sort((a, b) => b.totalSales - a.totalSales),
        },
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
  }

  @OnEvent('alert.slow-moving-inventory')
  async handleSlowMovingInventoryAlert(items: any[]) {
    this.logger.info(`Queuing slow-moving inventory alert for ${items.length} items`);

    await this.emailQueue.add(
      'send-email',
      {
        to: await this.getAdminEmails(),
        template: 'slow-moving-inventory',
        data: {
          items,
          totalItems: items.length,
        },
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
  }

  @OnEvent('report.shrinkage')
  async handleShrinkageReport(payload: { report: any; recipients: any[] }) {
    this.logger.info('Queuing shrinkage report');

    const emails = payload.recipients.map(r => r.email);

    await this.emailQueue.add(
      'send-email',
      {
        to: emails,
        template: 'shrinkage-report',
        data: {
          month: payload.report.month,
          totalUnits: payload.report.totalUnits,
          estimatedValue: payload.report.estimatedValue,
          shrinkageRate: payload.report.shrinkageRate,
          byBranch: payload.report.byBranch,
          topProducts: payload.report.topProducts,
        },
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
  }

  // ==================== HELPER METHODS ====================

  private async getAdminEmails(): Promise<string[]> {
    // This should fetch from database
    // For now, returning config value
    const adminEmail = this.configService.get('ADMIN_EMAIL');
    return adminEmail ? [adminEmail] : [];
  }

  // ==================== PUBLIC METHODS FOR MANUAL TRIGGERING ====================

  async sendLowStockAlert(data: any) {
    await this.handleLowStockAlert(data);
  }

  async sendPurchaseOrderSuggestion(purchaseOrder: any) {
    await this.handlePurchaseOrderSuggestion(purchaseOrder);
  }

  async sendDailySalesReport(report: any, recipients: any[]) {
    await this.handleDailySalesReport({ report, recipients });
  }

  async sendWeeklyReport(report: any, recipients: any[]) {
    await this.handleWeeklyReport({ report, recipients });
  }

  async sendMonthlyPLReport(report: any, recipients: any[]) {
    await this.handleMonthlyPLReport({ report, recipients });
  }

  async sendTaxSummary(summary: any, recipients: any[]) {
    await this.handleTaxSummary({ summary, recipients });
  }

  async sendSalesTargetAlert(data: any) {
    await this.handleSalesTargetAlert(data);
  }

  async sendPerformanceSummary(performanceData: any[], recipients: any[]) {
    await this.handlePerformanceSummary({ performanceData, recipients });
  }

  async sendSlowMovingInventoryAlert(items: any[]) {
    await this.handleSlowMovingInventoryAlert(items);
  }

  async sendShrinkageReport(report: any, recipients: any[]) {
    await this.handleShrinkageReport({ report, recipients });
  }
}