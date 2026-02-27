import { Inject, Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import moment from 'moment';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { StockMovement } from '../stock/entities/stock.entity';
import { InvoiceItem } from '../invoices/entities/invoice_items.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

// ==================== REPORT SERVICE ====================
@Injectable()
export class ReportService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Purchase)
    private purchaseRepo: Repository<Purchase>,
    @InjectRepository(StockMovement)
    private stockMovementRepo: Repository<StockMovement>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepo: Repository<InvoiceItem>,
  ) {}

  // ==================== WEEKLY REPORTS ====================

  async generateWeeklyReport(startDate: Date, endDate: Date) {
    this.logger.info(
      `Generating weekly report from ${startDate} to ${endDate}`,
    );

    // Get current period aggregation
    const result = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .select('SUM(invoice.totalAmount)', 'totalRevenue')
      .addSelect('COUNT(invoice.id)', 'totalOrders')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' })
      .getRawOne();

    const totalRevenue = Number(result?.totalRevenue || 0);
    const totalOrders = Number(result?.totalOrders || 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get previous period data
    const prevWeekStart = moment(startDate).subtract(1, 'week').toDate();
    const prevWeekEnd = moment(endDate).subtract(1, 'week').toDate();

    const prevResult = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .select('SUM(invoice.totalAmount)', 'prevTotalRevenue')
      .addSelect('COUNT(invoice.id)', 'prevTotalOrders')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate: prevWeekStart,
        endDate: prevWeekEnd,
      })
      .andWhere('invoice.status = :status', { status: 'paid' })
      .getRawOne();

    const prevTotalRevenue = Number(prevResult?.prevTotalRevenue || 0);
    const prevTotalOrders = Number(prevResult?.prevTotalOrders || 0);

    const revenueGrowth =
      prevTotalRevenue > 0
        ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100
        : 0;
    const ordersGrowth =
      prevTotalOrders > 0
        ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100
        : 0;

    // Get top products using QueryBuilder
    const topProductsRaw = await this.invoiceItemRepo
      .createQueryBuilder('item')
      .leftJoin('item.invoice', 'invoice')
      .leftJoin('item.variant', 'variant')
      .leftJoin('variant.product', 'product')
      .select('product.name', 'name')
      .addSelect('SUM(item.quantity)', 'quantity')
      .addSelect('SUM(item.subtotal)', 'revenue')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' })
      .groupBy('product.id')
      .addGroupBy('product.name')
      .orderBy('quantity', 'DESC')
      .limit(10)
      .getRawMany();

    const topProducts = topProductsRaw.map((p) => ({
      name: p.name,
      quantity: Number(p.quantity),
      revenue: Number(p.revenue),
    }));

    return {
      weekStart: moment(startDate).format('MMM DD, YYYY'),
      weekEnd: moment(endDate).format('MMM DD, YYYY'),
      totalRevenue,
      totalOrders,
      averageOrderValue,
      revenueGrowth,
      ordersGrowth,
      topProducts,
      invoices: totalOrders,
    };
  }

  // ==================== PROFIT & LOSS ====================

  async generateProfitLossReport(startDate: Date, endDate: Date) {
    this.logger.info(`Generating P&L report from ${startDate} to ${endDate}`);

    const revenueResult = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .select('SUM(invoice.totalAmount)', 'totalRevenue')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' })
      .getRawOne();

    const totalRevenue = Number(revenueResult?.totalRevenue || 0);

    const cogsResult = await this.invoiceItemRepo
      .createQueryBuilder('item')
      .leftJoin('item.invoice', 'invoice')
      .leftJoin('item.variant', 'variant')
      .select('SUM(item.quantity * variant.costPrice)', 'cogs')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' })
      .getRawOne();

    const cogs = Number(cogsResult?.cogs || 0);
    const grossProfit = totalRevenue - cogs;
    const grossMargin =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const expensesResult = await this.purchaseRepo
      .createQueryBuilder('purchase')
      .select('SUM(purchase.totalAmount)', 'operatingExpenses')
      .where('purchase.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('purchase.status = :status', { status: 'completed' })
      .getRawOne();

    const operatingExpenses = Number(expensesResult?.operatingExpenses || 0);

    // Calculate net profit
    const netProfit = grossProfit - operatingExpenses;
    const profitMargin =
      totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      month: moment(startDate).format('MMMM YYYY'),
      startDate,
      endDate,
      totalRevenue,
      cogs,
      grossProfit,
      grossMargin,
      operatingExpenses,
      netProfit,
      profitMargin,
    };
  }

  // ==================== TAX SUMMARY ====================

  async generateTaxSummary(startDate: Date, endDate: Date) {
    this.logger.info(`Generating tax summary from ${startDate} to ${endDate}`);

    const summaryResult = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .select('SUM(invoice.totalAmount)', 'totalSales')
      .addSelect('SUM(invoice.tax)', 'totalTaxCollected')
      .addSelect('SUM(invoice.subtotal)', 'taxableAmount')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' })
      .getRawOne();

    const totalSales = Number(summaryResult?.totalSales || 0);
    const totalTaxCollected = Number(summaryResult?.totalTaxCollected || 0);
    const taxableAmount = Number(summaryResult?.taxableAmount || 0);
    const taxRate =
      taxableAmount > 0 ? (totalTaxCollected / taxableAmount) * 100 : 0;

    const monthlyRaw = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .select("TO_CHAR(invoice.createdAt, 'Mon YYYY')", 'month')
      .addSelect('SUM(invoice.totalAmount)', 'revenue')
      .addSelect('SUM(invoice.tax)', 'tax')
      .addSelect('COUNT(invoice.id)', 'invoiceCount')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' })
      .groupBy("TO_CHAR(invoice.createdAt, 'Mon YYYY')")
      .orderBy('MAX(invoice.createdAt)', 'ASC')
      .getRawMany();

    const monthlyBreakdown = monthlyRaw.map((m) => ({
      month: m.month,
      revenue: Number(m.revenue),
      tax: Number(m.tax),
      invoiceCount: Number(m.invoiceCount),
    }));

    const quarter = moment(startDate).quarter();
    const year = moment(startDate).year();

    return {
      quarter,
      year,
      startDate,
      endDate,
      totalSales,
      taxableAmount,
      totalTaxCollected,
      taxRate,
      monthlyBreakdown,
    };
  }

  // ==================== FORECASTING ====================

  async generateForecastingData() {
    this.logger.info('Generating sales forecasting data');

    const twelveMonthsAgo = moment().subtract(12, 'months').toDate();
    const now = new Date();

    const monthlyRaw = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .select("TO_CHAR(invoice.createdAt, 'Mon YYYY')", 'month')
      .addSelect('SUM(invoice.totalAmount)', 'revenue')
      .addSelect('COUNT(invoice.id)', 'orders')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate: twelveMonthsAgo,
        endDate: now,
      })
      .andWhere('invoice.status = :status', { status: 'paid' })
      .groupBy("TO_CHAR(invoice.createdAt, 'Mon YYYY')")
      .orderBy('MAX(invoice.createdAt)', 'ASC')
      .getRawMany();

    const monthlyData = monthlyRaw.map((m) => ({
      month: m.month,
      revenue: Number(m.revenue),
      orders: Number(m.orders),
      averageOrderValue:
        Number(m.orders) > 0 ? Number(m.revenue) / Number(m.orders) : 0,
    }));

    // Simple linear regression for next month prediction
    const prediction = this.predictNextMonth(monthlyData);

    return {
      historical: monthlyData,
      prediction,
      generatedAt: new Date(),
    };
  }

  // ==================== SHRINKAGE REPORT ====================

  async generateShrinkageReport(shrinkageData: StockMovement[]) {
    this.logger.info('Generating shrinkage report');

    // Calculate total shrinkage
    const totalUnits = shrinkageData.reduce(
      (sum, item) => sum + Math.abs(item.quantityChange),
      0,
    );

    // Calculate estimated value
    const estimatedValue = shrinkageData.reduce((sum, item) => {
      return (
        sum + Math.abs(item.quantityChange) * Number(item.variant.costPrice)
      );
    }, 0);

    // Group by branch
    const byBranch = new Map();
    shrinkageData.forEach((item) => {
      const branchId = item.branch.id;
      const existing = byBranch.get(branchId) || {
        branchName: item.branch.name,
        units: 0,
        value: 0,
      };
      existing.units += Math.abs(item.quantityChange);
      existing.value +=
        Math.abs(item.quantityChange) * Number(item.variant.costPrice);
      byBranch.set(branchId, existing);
    });

    // Group by product
    const byProduct = new Map();
    shrinkageData.forEach((item) => {
      const productId = item.variant.product.id;
      const existing = byProduct.get(productId) || {
        productName: item.variant.product.name,
        units: 0,
        value: 0,
      };
      existing.units += Math.abs(item.quantityChange);
      existing.value +=
        Math.abs(item.quantityChange) * Number(item.variant.costPrice);
      byProduct.set(productId, existing);
    });

    const topProducts = Array.from(byProduct.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Calculate shrinkage rate (as % of total inventory value)
    // This would require total inventory value - simplified here
    const shrinkageRate = 0.5; // Placeholder

    return {
      month: moment().subtract(1, 'month').format('MMMM YYYY'),
      totalUnits,
      estimatedValue,
      shrinkageRate,
      byBranch: Array.from(byBranch.values()),
      topProducts,
    };
  }

  // ==================== HELPER METHODS ====================

  private predictNextMonth(monthlyData: any[]) {
    // Simple moving average prediction
    const lastThreeMonths = monthlyData.slice(-3);
    const avgRevenue =
      lastThreeMonths.reduce((sum, m) => sum + m.revenue, 0) / 3;
    const avgOrders = lastThreeMonths.reduce((sum, m) => sum + m.orders, 0) / 3;

    // Calculate trend
    const trend =
      monthlyData.length >= 2
        ? monthlyData[monthlyData.length - 1].revenue -
          monthlyData[monthlyData.length - 2].revenue
        : 0;

    return {
      month: moment().add(1, 'month').format('MMM YYYY'),
      predictedRevenue: avgRevenue + trend,
      predictedOrders: Math.round(avgOrders),
      confidence: 'medium', // Would use more sophisticated algorithms in production
    };
  }
}

// ==================== BACKUP SERVICE ====================
// @Injectable()
// export class BackupService {
//   private readonly logger = new Logger(BackupService.name);

//   constructor(private configService: ConfigService) {}

//   async createFullBackup() {
//     this.logger.log('Creating full database backup');

//     // Implementation depends on your database
//     // For PostgreSQL:
//     // const { exec } = require('child_process');
//     // const backupFile = `backup-${moment().format('YYYY-MM-DD-HHmmss')}.sql`;
//     // exec(`pg_dump ${dbName} > ${backupFile}`, (error, stdout, stderr) => {
//     //   if (error) {
//     //     this.logger.error('Backup failed', error);
//     //     return;
//     //   }
//     //   this.logger.log('Backup completed successfully');
//     //   // Upload to S3, Google Cloud Storage, etc.
//     // });

//     this.logger.log('Backup process completed');
//   }

//   async archiveInvoices(invoices: Invoice[]) {
//     this.logger.log(`Archiving ${invoices.length} invoices`);

//     // Export to JSON or CSV
//     const archiveData = JSON.stringify(invoices, null, 2);
//     const fileName = `archive-invoices-${moment().format('YYYY-MM-DD')}.json`;

//     // Save to file system or cloud storage
//     // fs.writeFileSync(`./archives/${fileName}`, archiveData);

//     this.logger.log(`Invoices archived to ${fileName}`);
//   }

//   async restoreFromBackup(backupFile: string) {
//     this.logger.log(`Restoring from backup: ${backupFile}`);

//     // Implementation depends on your database
//     // For PostgreSQL:
//     // exec(`psql ${dbName} < ${backupFile}`, ...);

//     this.logger.log('Restore completed');
//   }
// }
