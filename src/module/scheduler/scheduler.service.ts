import { Inject, Injectable } from '@nestjs/common';
import { CreateSchedulerDto } from './dto/create-scheduler.dto';
import { UpdateSchedulerDto } from './dto/update-scheduler.dto';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { CronJob } from 'cron';
import {
  WINSTON_MODULE_NEST_PROVIDER,
  WINSTON_MODULE_PROVIDER,
} from 'nest-winston';
import { Logger } from 'winston';
import moment from 'moment';

import { User } from '../users/entities/user.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Branch } from '../branches/entities/branch.entity';
import { StockMovement } from '../stock/entities/stock.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { ReportService } from '../reports/reports.service';
import { NotificationService } from './notification.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
@Injectable()
export class SchedulerService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepo: Repository<Inventory>,
    @InjectRepository(StockMovement)
    private stockMovementRepo: Repository<StockMovement>,
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Purchase)
    private purchaseRepo: Repository<Purchase>,
    @InjectRepository(ProductVariant)
    private variantRepo: Repository<ProductVariant>,
    @InjectRepository(Branch)
    private branchRepo: Repository<Branch>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private schedulerRegistry: SchedulerRegistry,
    private notificationService: NotificationService,
    private reportService: ReportService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private eventEmitter: EventEmitter2,
  ) {}

  // ==================== LOW STOCK ALERTS ====================

  @Cron(CronExpression.EVERY_HOUR)
  async checkLowStock() {
    this.logger.info('Running low stock check...');

    try {
      const lowStockItems = await this.inventoryRepo
        .createQueryBuilder('inventory')
        .leftJoinAndSelect('inventory.variant', 'variant')
        .leftJoinAndSelect('variant.product', 'product')
        .leftJoinAndSelect('product.supplier', 'supplier')
        .leftJoinAndSelect('inventory.branch', 'branch')
        .where('inventory.quantity < inventory.minThreshold')
        .getMany();

      for (const item of lowStockItems) {
        // Emit event instead of direct call
        await this.eventEmitter.emitAsync('inventory.low-stock', {
          variantSku: item.variant.sku,
          productName: item.variant.product.name,
          branchName: item.branch.name,
          currentStock: item.quantity,
          minThreshold: item.minThreshold,
          reorderSuggestion: this.calculateReorderQuantity(item),
        });

        // Update alert status
        item.lowStockAlertSent = true;
        item.lastAlertSentAt = new Date();
        await this.inventoryRepo.save(item);
      }

      this.logger.info(
        `Low stock check completed. ${lowStockItems.length} alerts sent.`,
      );
    } catch (error) {
      this.logger.error('Error in low stock check:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetLowStockAlerts() {
    this.logger.info('Resetting low stock alerts...');

    try {
      await this.inventoryRepo.update(
        { lowStockAlertSent: true },
        { lowStockAlertSent: false },
      );

      this.logger.info('Low stock alerts reset successfully');
    } catch (error) {
      this.logger.error('Error resetting low stock alerts:', error);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  // @Cron('* * * * *')
  async generateReorderSuggestions() {
    this.logger.info('Generating auto-reorder suggestions...');

    try {
      const lowStockItems = await this.inventoryRepo
        .createQueryBuilder('inventory')
        .leftJoinAndSelect('inventory.variant', 'variant')
        .leftJoinAndSelect('variant.product', 'product')
        .leftJoinAndSelect('product.supplier', 'supplier')
        .leftJoinAndSelect('inventory.branch', 'branch')
        .where('inventory.quantity < inventory.minThreshold')
        .getMany();

      const supplierGroups = this.groupBySupplier(lowStockItems);

      for (const [supplierId, items] of Object.entries(supplierGroups)) {
        const purchaseOrder = {
          supplier: items[0].variant.product.supplier,
          items: items.map((item) => ({
            variant: item.variant,
            suggestedQuantity: this.calculateReorderQuantity(item),
            currentStock: item.quantity,
            minThreshold: item.minThreshold,
            branch: item.branch,
          })),
          totalEstimatedCost: this.calculateTotalCost(items),
        };

        // Emit event
        await this.eventEmitter.emitAsync(
          'inventory.reorder-suggestion',
          purchaseOrder,
        );
      }

      this.logger.info('Reorder suggestions generated successfully');
    } catch (error) {
      this.logger.error('Error generating reorder suggestions:', error);
    }
  }

  // ==================== FINANCIAL REPORTS ====================

  @Cron('55 23 * * *')
  // @Cron('* * * * *')
  async endOfDaySalesReport() {
    this.logger.info('Generating end of day sales report...');

    try {
      const today = moment().startOf('day').toDate();
      const endOfDay = moment().endOf('day').toDate();

      const branches = await this.branchRepo.find({
        where: { isActive: true },
      });

      for (const branch of branches) {
        const report = await this.generateDailySalesReport(
          branch,
          today,
          endOfDay,
        );

        const recipients = await this.userRepo.find({
          where: [
            { branch: { id: branch.id }, role: 'manager' },
            { role: 'admin' },
          ],
        });

        // Emit event
        await this.eventEmitter.emitAsync('report.daily-sales', {
          report,
          recipients,
        });
      }

      this.logger.info('End of day reports sent successfully');
    } catch (error) {
      this.logger.error('Error generating end of day report:', error);
    }
  }

  @Cron('0 9 * * 1')
  // @Cron('* * * * *')
  async weeklyRevenueReport() {
    this.logger.info('Generating weekly revenue report...');

    try {
      const startOfWeek = moment().subtract(1, 'week').startOf('week').toDate();
      const endOfWeek = moment().subtract(1, 'week').endOf('week').toDate();

      const report = await this.reportService.generateWeeklyReport(
        startOfWeek,
        endOfWeek,
      );

      const admins = await this.userRepo.find({ where: { role: 'admin' } });

      // Emit event
      await this.eventEmitter.emitAsync('report.weekly-sales', {
        report,
        recipients: admins,
      });

      this.logger.info('Weekly report sent successfully');
    } catch (error) {
      this.logger.error('Error generating weekly report:', error);
    }
  }

  @Cron('0 10 1 * *')
  // @Cron('* * * * *') // كل دقيقة
  async monthlyProfitLossReport() {
    this.logger.info('Generating monthly P&L report...');

    try {
      const startOfMonth = moment()
        .subtract(1, 'month')
        .startOf('month')
        .toDate();
      const endOfMonth = moment().subtract(1, 'month').endOf('month').toDate();

      const report = await this.reportService.generateProfitLossReport(
        startOfMonth,
        endOfMonth,
      );

      const admins = await this.userRepo.find({ where: { role: 'admin' } });

      // this.logger.info(
      //   `
      //   admins accounts ${
      //     admins.map(e=>{
      //       return e.email
      //     })
      //   }
      //   `
      // )
      // Emit event
      await this.eventEmitter.emitAsync('report.monthly-pl', {
        report,
        recipients: admins,
      });

      this.logger.info('Monthly P&L report sent successfully');
    } catch (error) {
      this.logger.error('Error generating monthly P&L report:', error);
    }
  }

  @Cron('0 11 1 1,4,7,10 *')
  // @Cron('* * * * *')
  async quarterlyTaxSummary() {
    this.logger.info('Generating quarterly tax summary...');

    try {
      const startOfQuarter = moment()
        .subtract(1, 'quarter')
        .startOf('quarter')
        .toDate();
      const endOfQuarter = moment()
        .subtract(1, 'quarter')
        .endOf('quarter')
        .toDate();

      const taxSummary = await this.reportService.generateTaxSummary(
        startOfQuarter,
        endOfQuarter,
      );

      const admins = await this.userRepo.find({ where: { role: 'admin' } });

      // Emit event
      await this.eventEmitter.emitAsync('report.tax-summary', {
        summary: taxSummary,
        recipients: admins,
      });

      this.logger.info('Quarterly tax summary sent successfully');
    } catch (error) {
      this.logger.error('Error generating tax summary:', error);
    }
  }

  // ==================== DATA CLEANUP & MAINTENANCE ====================

  // @Cron('0 2 1 * *')
  // async archiveOldInvoices() {
  //   this.logger.info('Archiving old invoices...');

  //   try {
  //     const archiveDate = moment().subtract(12, 'months').toDate();

  //     const oldInvoices = await this.invoiceRepo.find({
  //       where: {
  //         createdAt: LessThan(archiveDate),
  //         status: 'paid',
  //       },
  //       relations: ['items'],
  //     });

  //     await this.backupService.archiveInvoices(oldInvoices);

  //     this.logger.info(`Archived ${oldInvoices.length} invoices`);
  //   } catch (error) {
  //     this.logger.error('Error archiving invoices:', error);
  //   }
  // }

  @Cron('0 3 15 * *')
  // @Cron('* * * * *')
  async cleanupSoftDeleted() {
    this.logger.info('Cleaning up soft-deleted records...');

    try {
      const deleteDate = moment().subtract(3, 'months').toDate();

      const entities = [this.invoiceRepo, this.purchaseRepo, this.variantRepo];

      let totalDeleted = 0;
      for (const repo of entities) {
        const result = await repo
          .createQueryBuilder()
          .delete()
          .where('deleted_at IS NOT NULL')
          .andWhere('deleted_at < :deleteDate', { deleteDate })
          .execute();

        totalDeleted += result.affected || 0;
      }

      this.logger.info(`Permanently deleted ${totalDeleted} records`);
    } catch (error) {
      this.logger.error('Error cleaning up soft-deleted records:', error);
    }
  }

  // @Cron('0 1 * * *')
  // async createDatabaseBackup() {
  //   this.logger.info('Creating database backup...');

  //   try {
  //     await this.backupService.createFullBackup();
  //     this.logger.info('Database backup completed successfully');
  //   } catch (error) {
  //     this.logger.error('Error creating database backup:', error);
  //   }
  // }

  // @Cron('0 4 * * 0')
  // async generateForecastingData() {
  //   this.logger.info('Generating sales forecasting data...');

  //   try {
  //     await this.reportService.generateForecastingData();
  //     this.logger.info('Forecasting data generated successfully');
  //   } catch (error) {
  //     this.logger.error('Error generating forecasting data:', error);
  //   }
  // }

  // ==================== PERFORMANCE MONITORING ====================

  @Cron('0 18 * * *')
  // @Cron('* * * * *')
  async checkDailySalesTargets() {
    this.logger.info('Checking daily sales targets...');

    try {
      const branches = await this.branchRepo.find({
        where: { isActive: true },
      });

      for (const branch of branches) {
        const todaySales = await this.calculateDailySales(branch);
        const target = await this.getSalesTarget(branch, 'daily');

        if (todaySales < target * 0.8) {
          // Emit event
          await this.eventEmitter.emitAsync('alert.sales-target', {
            branch,
            actualSales: todaySales,
            target,
            percentage: (todaySales / target) * 100,
          });
        }
      }

      this.logger.info('Daily sales target check completed');
    } catch (error) {
      this.logger.error('Error checking sales targets:', error);
    }
  }

  @Cron('0 8 * * 1')
  // @Cron('* * * * *')
  async employeePerformanceSummary() {
    this.logger.info('Generating employee performance summary...');

    try {
      const startOfWeek = moment().subtract(1, 'week').startOf('week').toDate();
      const endOfWeek = moment().subtract(1, 'week').endOf('week').toDate();

      const users = await this.userRepo.find({
        where: { role: 'cashier' },
        relations: ['branch'],
      });

      const performanceData: {
        user: User;
        totalSales: number;
        totalOrders: number;
        averageOrderValue: number;
        period: {
          start: Date;
          end: Date;
        };
      }[] = [];
      for (const user of users) {
        const stats = await this.calculateUserPerformance(
          user,
          startOfWeek,
          endOfWeek,
        );
        performanceData.push(stats);
      }

      const managers = await this.userRepo.find({ where: { role: 'manager' } });
      const admins = await this.userRepo.find({ where: { role: 'admin' } });

      // Emit event
      await this.eventEmitter.emitAsync('report.employee-performance', {
        performanceData,
        recipients: [...managers, ...admins],
      });

      this.logger.info('Employee performance summary sent');
    } catch (error) {
      this.logger.error('Error generating performance summary:', error);
    }
  }

  // // @Cron('0 10 10 * *')
  // @Cron('* * * * *')
  // async slowMovingInventoryAlert() {
  //   this.logger.info('Checking for slow-moving inventory...');

  //   try {
  //     const threeMonthsAgo = moment().subtract(3, 'months').toDate();

  //     const slowMovingItems = await this.variantRepo
  //       .createQueryBuilder('variant')
  //       .leftJoin('variant.invoiceItems', 'item')
  //       .leftJoin('item.invoice', 'invoice')
  //       .leftJoin('variant.inventories', 'inventory')
  //       .leftJoin('variant.product', 'product')
  //       .where('invoice.createdAt < :threeMonthsAgo OR invoice.id IS NULL', {
  //         threeMonthsAgo,
  //       })
  //       .andWhere('inventory.quantity > 0')
  //       .select([
  //         'variant.id',
  //         'variant.sku',
  //         'product.name',
  //         'inventory.quantity',
  //         'inventory.branch',
  //       ])
  //       .getMany();

  //     if (slowMovingItems.length > 0) {
  //       // Emit event
  //       await this.eventEmitter.emitAsync('alert.slow-moving-inventory', slowMovingItems);
  //     }

  //     this.logger.info(`Found ${slowMovingItems.length} slow-moving items`);
  //   } catch (error) {
  //     this.logger.error('Error checking slow-moving inventory:', error);
  //   }
  // }

  @Cron('0 9 5 * *')
  async shrinkageTrackingReport() {
    this.logger.info('Generating shrinkage tracking report...');

    try {
      const startOfMonth = moment()
        .subtract(1, 'month')
        .startOf('month')
        .toDate();
      const endOfMonth = moment().subtract(1, 'month').endOf('month').toDate();

      const shrinkageData = await this.stockMovementRepo.find({
        where: {
          type: 'damage',
          createdAt: Between(startOfMonth, endOfMonth),
        },
        relations: ['variant', 'variant.product', 'branch', 'user'],
      });

      const report =
        await this.reportService.generateShrinkageReport(shrinkageData);

      const admins = await this.userRepo.find({ where: { role: 'admin' } });

      // Emit event
      await this.eventEmitter.emitAsync('report.shrinkage', {
        report,
        recipients: admins,
      });

      this.logger.info('Shrinkage report sent successfully');
    } catch (error) {
      this.logger.error('Error generating shrinkage report:', error);
    }
  }

  // ==================== HELPER METHODS ====================

  private calculateReorderQuantity(inventory: Inventory): number {
    const safetyStock = inventory.minThreshold * 2;
    const reorderQuantity = safetyStock - inventory.quantity;
    return Math.max(reorderQuantity, 0);
  }

  private groupBySupplier(items: Inventory[]): Record<string, Inventory[]> {
    return items.reduce(
      (acc, item) => {
        const supplierId = item.variant.product.supplier.id;
        if (!acc[supplierId]) {
          acc[supplierId] = [];
        }
        acc[supplierId].push(item);
        return acc;
      },
      {} as Record<string, Inventory[]>,
    );
  }

  private calculateTotalCost(items: Inventory[]): number {
    return items.reduce((total, item) => {
      const quantity = this.calculateReorderQuantity(item);
      return total + quantity * item.variant.costPrice;
    }, 0);
  }

  private async generateDailySalesReport(
    branch: Branch,
    startDate: Date,
    endDate: Date,
  ) {
    const result = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .select('SUM(invoice.totalAmount)', 'totalRevenue')
      .addSelect('COUNT(invoice.id)', 'totalOrders')
      .where('invoice.branchId = :branchId', { branchId: branch.id })
      .andWhere('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' })
      .getRawOne();

    const totalRevenue = Number(result?.totalRevenue || 0);
    const totalOrders = Number(result?.totalOrders || 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      branch,
      date: moment(startDate).format('YYYY-MM-DD'),
      totalRevenue,
      totalOrders,
      averageOrderValue,
    };
  }

  private async calculateDailySales(branch: Branch): Promise<number> {
    const today = moment().startOf('day').toDate();
    const endOfDay = moment().endOf('day').toDate();

    const result = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .select('SUM(invoice.totalAmount)', 'total')
      .where('invoice.branchId = :branchId', { branchId: branch.id })
      .andWhere('invoice.createdAt BETWEEN :start AND :end', {
        start: today,
        end: endOfDay,
      })
      .andWhere('invoice.status = :status', { status: 'paid' })
      .getRawOne();

    return Number(result?.total || 0);
  }

  private async getSalesTarget(
    branch: Branch,
    period: 'daily' | 'weekly' | 'monthly',
  ): Promise<number> {
    // This should fetch from a targets table
    return 10000; // Placeholder
  }

  private async calculateUserPerformance(
    user: User,
    startDate: Date,
    endDate: Date,
  ) {
    const result = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .select('SUM(invoice.totalAmount)', 'totalSales')
      .addSelect('COUNT(invoice.id)', 'totalOrders')
      .where('invoice.userId = :userId', { userId: user.id })
      .andWhere('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' })
      .getRawOne();

    const totalSales = Number(result?.totalSales || 0);
    const totalOrders = Number(result?.totalOrders || 0);
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    return {
      user,
      totalSales,
      totalOrders,
      averageOrderValue,
      period: {
        start: startDate,
        end: endDate,
      },
    };
  }

  // ==================== DYNAMIC JOB MANAGEMENT ====================

  addCustomJob(name: string, cronExpression: string, callback: () => void) {
    const job = new CronJob(cronExpression, callback);
    this.schedulerRegistry.addCronJob(name, job);
    job.start();

    this.logger.info(
      `Custom job '${name}' added with schedule: ${cronExpression}`,
    );
  }

  removeJob(name: string) {
    this.schedulerRegistry.deleteCronJob(name);
    this.logger.info(`Job '${name}' removed`);
  }

  getJobs(): Map<string, CronJob> {
    return this.schedulerRegistry.getCronJobs();
  }

  pauseJob(name: string) {
    const job = this.schedulerRegistry.getCronJob(name);
    job.stop();
    this.logger.info(`Job '${name}' paused`);
  }

  resumeJob(name: string) {
    const job = this.schedulerRegistry.getCronJob(name);
    job.start();
    this.logger.info(`Job '${name}' resumed`);
  }
}
