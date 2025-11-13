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
    this.logger.info(`Generating weekly report from ${startDate} to ${endDate}`);

    // Get invoices for the week
    const invoices = await this.invoiceRepo.find({
      where: {
        createdAt: Between(startDate, endDate),
        status: 'paid',
      },
      relations: ['items', 'items.variant', 'items.variant.product'],
    });

    // Get previous week data for comparison
    const prevWeekStart = moment(startDate).subtract(1, 'week').toDate();
    const prevWeekEnd = moment(endDate).subtract(1, 'week').toDate();
    const prevWeekInvoices = await this.invoiceRepo.find({
      where: {
        createdAt: Between(prevWeekStart, prevWeekEnd),
        status: 'paid',
      },
    });

    // Calculate metrics
    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    const totalOrders = invoices.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const prevTotalRevenue = prevWeekInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    const prevTotalOrders = prevWeekInvoices.length;

    const revenueGrowth = prevTotalRevenue > 0 
      ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 
      : 0;
    const ordersGrowth = prevTotalOrders > 0 
      ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100 
      : 0;

    // Get top products
    const productSales = new Map();
    invoices.forEach(invoice => {
      invoice.items.forEach(item => {
        const productId = item.variant.product.id;
        const existing = productSales.get(productId) || {
          name: item.variant.product.name,
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue += Number(item.subtotal);
        productSales.set(productId, existing);
      });
    });

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return {
      weekStart: moment(startDate).format('MMM DD, YYYY'),
      weekEnd: moment(endDate).format('MMM DD, YYYY'),
      totalRevenue,
      totalOrders,
      averageOrderValue,
      revenueGrowth,
      ordersGrowth,
      topProducts,
      invoices: invoices.length,
    };
  }

  // ==================== PROFIT & LOSS ====================
  
  async generateProfitLossReport(startDate: Date, endDate: Date) {
    this.logger.info(`Generating P&L report from ${startDate} to ${endDate}`);

    // Get revenue from invoices
    const invoices = await this.invoiceRepo.find({
      where: {
        createdAt: Between(startDate, endDate),
        status: 'paid',
      },
      relations: ['items', 'items.variant'],
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

    // Calculate COGS (Cost of Goods Sold)
    let cogs = 0;
    invoices.forEach(invoice => {
      invoice.items.forEach(item => {
        cogs += item.quantity * Number(item.variant.costPrice);
      });
    });

    const grossProfit = totalRevenue - cogs;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Get purchases (operating expenses)
    const purchases = await this.purchaseRepo.find({
      where: {
        createdAt: Between(startDate, endDate),
        status: 'completed',
      },
    });

    const operatingExpenses = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);

    // Calculate net profit
    const netProfit = grossProfit - operatingExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

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

    const invoices = await this.invoiceRepo.find({
      where: {
        createdAt: Between(startDate, endDate),
        status: 'paid',
      },
    });

    const totalSales = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    const totalTaxCollected = invoices.reduce((sum, inv) => sum + Number(inv.tax), 0);
    const taxableAmount = invoices.reduce((sum, inv) => sum + Number(inv.subtotal), 0);

    // Calculate average tax rate
    const taxRate = taxableAmount > 0 ? (totalTaxCollected / taxableAmount) * 100 : 0;

    // Tax breakdown by month
    const monthlyBreakdown = this.groupByMonth(invoices, startDate, endDate);

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

    // Get sales data for the past 12 months
    const twelveMonthsAgo = moment().subtract(12, 'months').toDate();
    const now = new Date();

    const invoices = await this.invoiceRepo.find({
      where: {
        createdAt: Between(twelveMonthsAgo, now),
        status: 'paid',
      },
    });

    // Group by month
    const monthlyData : { month: any; revenue: number; orders: number; averageOrderValue: number; }[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = moment().subtract(i, 'months').startOf('month').toDate();
      const monthEnd = moment().subtract(i, 'months').endOf('month').toDate();

      const monthInvoices = invoices.filter(inv => 
        inv.createdAt >= monthStart && inv.createdAt <= monthEnd
      );

      const revenue = monthInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
      const orders = monthInvoices.length;

      monthlyData.push({
        month: moment(monthStart).format('MMM YYYY'),
        revenue,
        orders,
        averageOrderValue: orders > 0 ? revenue / orders : 0,
      });
    }

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
    const totalUnits = shrinkageData.reduce((sum, item) => sum + Math.abs(item.quantityChange), 0);
    
    // Calculate estimated value
    const estimatedValue = shrinkageData.reduce((sum, item) => {
      return sum + (Math.abs(item.quantityChange) * Number(item.variant.costPrice));
    }, 0);

    // Group by branch
    const byBranch = new Map();
    shrinkageData.forEach(item => {
      const branchId = item.branch.id;
      const existing = byBranch.get(branchId) || {
        branchName: item.branch.name,
        units: 0,
        value: 0,
      };
      existing.units += Math.abs(item.quantityChange);
      existing.value += Math.abs(item.quantityChange) * Number(item.variant.costPrice);
      byBranch.set(branchId, existing);
    });

    // Group by product
    const byProduct = new Map();
    shrinkageData.forEach(item => {
      const productId = item.variant.product.id;
      const existing = byProduct.get(productId) || {
        productName: item.variant.product.name,
        units: 0,
        value: 0,
      };
      existing.units += Math.abs(item.quantityChange);
      existing.value += Math.abs(item.quantityChange) * Number(item.variant.costPrice);
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
  
  private groupByMonth(invoices: Invoice[], startDate: Date, endDate: Date) {
    const months : { month: any; revenue: number; tax: number; invoiceCount: number; } []= [];
    let current = moment(startDate);
    const end = moment(endDate);

    while (current <= end) {
      const monthStart = current.clone().startOf('month').toDate();
      const monthEnd = current.clone().endOf('month').toDate();

      const monthInvoices = invoices.filter(inv => 
        inv.createdAt >= monthStart && inv.createdAt <= monthEnd
      );

      const revenue = monthInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
      const tax = monthInvoices.reduce((sum, inv) => sum + Number(inv.tax), 0);

      months.push({
        month: current.format('MMM YYYY'),
        revenue,
        tax,
        invoiceCount: monthInvoices.length,
      });

      current.add(1, 'month');
    }

    return months;
  }

  private predictNextMonth(monthlyData: any[]) {
    // Simple moving average prediction
    const lastThreeMonths = monthlyData.slice(-3);
    const avgRevenue = lastThreeMonths.reduce((sum, m) => sum + m.revenue, 0) / 3;
    const avgOrders = lastThreeMonths.reduce((sum, m) => sum + m.orders, 0) / 3;

    // Calculate trend
    const trend = monthlyData.length >= 2 
      ? monthlyData[monthlyData.length - 1].revenue - monthlyData[monthlyData.length - 2].revenue
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

