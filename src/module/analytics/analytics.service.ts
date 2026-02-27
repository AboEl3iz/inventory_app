import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { Category } from '../categories/entities/category.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceItem } from '../invoices/entities/invoice_items.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { StockMovement } from '../stock/entities/stock.entity';
import { User } from '../users/entities/user.entity';
import moment from 'moment';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepo: Repository<InvoiceItem>,
    @InjectRepository(Purchase)
    private purchaseRepo: Repository<Purchase>,
    @InjectRepository(Inventory)
    private inventoryRepo: Repository<Inventory>,
    @InjectRepository(StockMovement)
    private stockMovementRepo: Repository<StockMovement>,
    @InjectRepository(ProductVariant)
    private variantRepo: Repository<ProductVariant>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
    @InjectRepository(Branch)
    private branchRepo: Repository<Branch>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}
  // ==================== OVERVIEW DASHBOARD ====================

  async getOverview(params: {
    period: string;
    startDate?: string;
    endDate?: string;
    branchId?: string;
  }) {
    const { startDate, endDate } = this.getDateRange(
      params.period,
      params.startDate,
      params.endDate,
    );
    const { startDate: prevStartDate, endDate: prevEndDate } =
      this.getPreviousPeriod(startDate, endDate);

    // Current period data
    const currentData = await this.getPeriodData(
      startDate,
      endDate,
      params.branchId,
    );

    // Previous period data for comparison
    const previousData = await this.getPeriodData(
      prevStartDate,
      prevEndDate,
      params.branchId,
    );

    // Calculate growth percentages
    const revenueGrowth = this.calculateGrowth(
      currentData.revenue,
      previousData.revenue,
    );
    const ordersGrowth = this.calculateGrowth(
      currentData.orders,
      previousData.orders,
    );
    const avgOrderGrowth = this.calculateGrowth(
      currentData.avgOrderValue,
      previousData.avgOrderValue,
    );

    // Get top selling products
    const topProducts = await this.getTopProducts(
      startDate,
      endDate,
      params.branchId,
      5,
    );

    // Get low stock alerts count
    const lowStockCount = await this.getLowStockCount(params.branchId);

    return {
      current: {
        revenue: currentData.revenue,
        orders: currentData.orders,
        avgOrderValue: currentData.avgOrderValue,
        customers: currentData.customers,
      },
      previous: {
        revenue: previousData.revenue,
        orders: previousData.orders,
        avgOrderValue: previousData.avgOrderValue,
      },
      growth: {
        revenue: revenueGrowth,
        orders: ordersGrowth,
        avgOrderValue: avgOrderGrowth,
      },
      topProducts,
      lowStockAlerts: lowStockCount,
      period: {
        start: startDate,
        end: endDate,
      },
    };
  }

  // async getKPIs(params: {
  //   period: string;
  //   startDate?: string;
  //   endDate?: string;
  //   branchId?: string;
  // }) {
  //   const { startDate, endDate } = this.getDateRange(params.period, params.startDate, params.endDate);

  //   const [
  //     salesData,
  //     inventoryValue,
  //     profitData,
  //     customerData,
  //   ] = await Promise.all([
  //     this.getSalesKPIs(startDate, endDate, params.branchId),
  //     this.getInventoryValueKPI(params.branchId),
  //     this.getProfitKPIs(startDate, endDate, params.branchId),
  //     this.getCustomerKPIs(startDate, endDate, params.branchId),
  //   ]);

  //   return {
  //     sales: salesData,
  //     inventory: inventoryValue,
  //     profit: profitData,
  //     customers: customerData,
  //     period: { start: startDate, end: endDate },
  //   };
  // }

  async getAllWidgets(params: { period: string; branchId?: string }) {
    const { startDate, endDate } = this.getDateRange(params.period);

    const [overview, salesTrend, topProducts, lowStock] = await Promise.all([
      this.getOverview({ period: params.period, branchId: params.branchId }),
      this.getSalesTrends({
        groupBy: 'day',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        branchId: params.branchId,
      }),
      this.getTopProducts(startDate, endDate, params.branchId, 10),
      this.getLowStockItems(params.branchId),
    ]);

    return {
      overview,
      salesTrend,
      topProducts,
      lowStock,
    };
  }

  // ==================== SALES ANALYTICS ====================

  async getSalesTrends(params: {
    groupBy: string;
    startDate?: string;
    endDate?: string;
    branchId?: string;
  }) {
    const startDate = params.startDate
      ? moment(params.startDate).toDate()
      : moment().subtract(30, 'days').toDate();
    const endDate = params.endDate
      ? moment(params.endDate).toDate()
      : moment().toDate();

    let pgFormat = 'YYYY-MM-DD';

    switch (params.groupBy) {
      case 'week':
        pgFormat = 'IYYY-"W"IW';
        break;
      case 'month':
        pgFormat = 'YYYY-MM';
        break;
      case 'day':
      default:
        pgFormat = 'YYYY-MM-DD';
    }

    let query = this.invoiceRepo
      .createQueryBuilder('invoice')
      .select(`TO_CHAR(invoice.createdAt, '${pgFormat}')`, 'label')
      .addSelect('SUM(invoice.totalAmount)', 'revenue')
      .addSelect('COUNT(invoice.id)', 'orders')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' })
      .groupBy(`TO_CHAR(invoice.createdAt, '${pgFormat}')`)
      .orderBy('MIN(invoice.createdAt)', 'ASC');

    if (params.branchId) {
      query = query.andWhere('invoice.branchId = :branchId', {
        branchId: params.branchId,
      });
    }

    const results = await query.getRawMany();

    return {
      labels: results.map((r) => r.label),
      data: {
        revenue: results.map((r) => Number(r.revenue)),
        orders: results.map((r) => Number(r.orders)),
        avgOrderValue: results.map((r) =>
          Number(r.orders) > 0 ? Number(r.revenue) / Number(r.orders) : 0,
        ),
      },
    };
  }

  async getSalesByCategory(params: { period: string; branchId?: string }) {
    const { startDate, endDate } = this.getDateRange(params.period);

    let query = this.invoiceItemRepo
      .createQueryBuilder('item')
      .leftJoin('item.invoice', 'invoice')
      .leftJoin('item.variant', 'variant')
      .leftJoin('variant.product', 'product')
      .leftJoin('product.category', 'category')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' });

    if (params.branchId) {
      query = query.andWhere('invoice.branchId = :branchId', {
        branchId: params.branchId,
      });
    }

    const results = await query
      .select('category.name', 'categoryName')
      .addSelect('category.id', 'categoryId')
      .addSelect('SUM(item.subtotal)', 'revenue')
      .addSelect('SUM(item.quantity)', 'quantity')
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('revenue', 'DESC')
      .getRawMany();

    const total = results.reduce((sum, r) => sum + Number(r.revenue), 0);

    return results.map((r) => ({
      categoryId: r.categoryId,
      categoryName: r.categoryName || 'Uncategorized',
      revenue: Number(r.revenue),
      quantity: Number(r.quantity),
      percentage: total > 0 ? (Number(r.revenue) / total) * 100 : 0,
    }));
  }

  async getSalesByBranch(params: { period: string }) {
    const { startDate, endDate } = this.getDateRange(params.period);

    const results = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .leftJoin('invoice.branch', 'branch')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' })
      .select('branch.id', 'branchId')
      .addSelect('branch.name', 'branchName')
      .addSelect('SUM(invoice.totalAmount)', 'revenue')
      .addSelect('COUNT(invoice.id)', 'orders')
      .addSelect('AVG(invoice.totalAmount)', 'avgOrderValue')
      .groupBy('branch.id')
      .addGroupBy('branch.name')
      .orderBy('revenue', 'DESC')
      .getRawMany();

    return results.map((r) => ({
      branchId: r.branchId,
      branchName: r.branchName,
      revenue: Number(r.revenue),
      orders: Number(r.orders),
      avgOrderValue: Number(r.avgOrderValue),
    }));
  }

  async getSalesByUser(params: { period: string; branchId?: string }) {
    const { startDate, endDate } = this.getDateRange(params.period);

    let query = this.invoiceRepo
      .createQueryBuilder('invoice')
      .leftJoin('invoice.user', 'user')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' });

    if (params.branchId) {
      query = query.andWhere('invoice.branchId = :branchId', {
        branchId: params.branchId,
      });
    }

    const results = await query
      .select('user.id', 'userId')
      .addSelect('user.name', 'userName')
      .addSelect('SUM(invoice.totalAmount)', 'revenue')
      .addSelect('COUNT(invoice.id)', 'orders')
      .addSelect('AVG(invoice.totalAmount)', 'avgOrderValue')
      .groupBy('user.id')
      .addGroupBy('user.name')
      .orderBy('revenue', 'DESC')
      .getRawMany();

    return results.map((r) => ({
      userId: r.userId,
      userName: r.userName,
      revenue: Number(r.revenue),
      orders: Number(r.orders),
      avgOrderValue: Number(r.avgOrderValue),
    }));
  }

  async getPaymentMethodsBreakdown(params: {
    period: string;
    branchId?: string;
  }) {
    const { startDate, endDate } = this.getDateRange(params.period);

    let query = this.invoiceRepo
      .createQueryBuilder('invoice')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' });

    if (params.branchId) {
      query = query.andWhere('invoice.branchId = :branchId', {
        branchId: params.branchId,
      });
    }

    const results = await query
      .select('invoice.paymentMethod', 'method')
      .addSelect('COUNT(invoice.id)', 'count')
      .addSelect('SUM(invoice.totalAmount)', 'amount')
      .groupBy('invoice.paymentMethod')
      .orderBy('amount', 'DESC')
      .getRawMany();

    const total = results.reduce((sum, r) => sum + Number(r.amount), 0);

    return results.map((r) => ({
      method: r.method || 'Unknown',
      count: Number(r.count),
      amount: Number(r.amount),
      percentage: total > 0 ? (Number(r.amount) / total) * 100 : 0,
    }));
  }

  async getPeakHoursAnalysis(params: { period: string; branchId?: string }) {
    const { startDate, endDate } = this.getDateRange(params.period);

    let query = this.invoiceRepo
      .createQueryBuilder('invoice')
      .select('EXTRACT(HOUR FROM invoice.createdAt)', 'hour')
      .addSelect('COUNT(invoice.id)', 'count')
      .addSelect('SUM(invoice.totalAmount)', 'revenue')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' })
      .groupBy('EXTRACT(HOUR FROM invoice.createdAt)');

    if (params.branchId) {
      query = query.andWhere('invoice.branchId = :branchId', {
        branchId: params.branchId,
      });
    }

    const results = await query.getRawMany();

    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const dbHour = results.find((r) => Number(r.hour) === hour);
      return {
        hour: `${hour.toString().padStart(2, '0')}:00`,
        orders: dbHour ? Number(dbHour.count) : 0,
        revenue: dbHour ? Number(dbHour.revenue) : 0,
      };
    });

    return hourlyData;
  }

  // ==================== INVENTORY DASHBOARD ====================

  async getInventoryStatus(params: {
    branchId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limitParams = params.limit || 50;

    let queryBase = this.inventoryRepo.createQueryBuilder('inventory');
    if (params.branchId) {
      queryBase = queryBase.where('inventory.branchId = :branchId', {
        branchId: params.branchId,
      });
    }

    // 1. Calculate Summary (avoiding moving full tables into process memory)
    const summaryResult = await queryBase
      .clone()
      .select('COUNT(inventory.id)', 'total')
      .addSelect(
        'SUM(CASE WHEN inventory.quantity = 0 THEN 1 ELSE 0 END)',
        'outOfStock',
      )
      .addSelect(
        'SUM(CASE WHEN inventory.quantity > 0 AND inventory.quantity <= inventory.minThreshold THEN 1 ELSE 0 END)',
        'lowStock',
      )
      .addSelect(
        'SUM(CASE WHEN inventory.quantity > inventory.minThreshold * 5 THEN 1 ELSE 0 END)',
        'overstocked',
      )
      .addSelect(
        'SUM(CASE WHEN inventory.quantity > inventory.minThreshold AND inventory.quantity <= inventory.minThreshold * 5 THEN 1 ELSE 0 END)',
        'inStock',
      )
      .getRawOne();

    const summary = {
      total: Number(summaryResult?.total || 0),
      inStock: Number(summaryResult?.instock || 0),
      lowStock: Number(summaryResult?.lowstock || 0),
      outOfStock: Number(summaryResult?.outofstock || 0),
      overstocked: Number(summaryResult?.overstocked || 0),
    };

    // 2. Filter paginated records
    let itemsQuery = queryBase
      .clone()
      .leftJoinAndSelect('inventory.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('inventory.branch', 'branch');

    if (params.status && params.status !== 'all') {
      if (params.status === 'out-of-stock') {
        itemsQuery = itemsQuery.andWhere('inventory.quantity = 0');
      } else if (params.status === 'low-stock') {
        itemsQuery = itemsQuery.andWhere(
          'inventory.quantity > 0 AND inventory.quantity <= inventory.minThreshold',
        );
      } else if (params.status === 'overstocked') {
        itemsQuery = itemsQuery.andWhere(
          'inventory.quantity > inventory.minThreshold * 5',
        );
      } else if (params.status === 'in-stock') {
        itemsQuery = itemsQuery.andWhere(
          'inventory.quantity > inventory.minThreshold AND inventory.quantity <= inventory.minThreshold * 5',
        );
      }
    }

    const [inventories, totalItems] = await itemsQuery
      .skip((page - 1) * limitParams)
      .take(limitParams)
      .getManyAndCount();

    const items = inventories.map((inv) => {
      let status = 'in-stock';
      if (inv.quantity === 0) status = 'out-of-stock';
      else if (inv.quantity <= inv.minThreshold) status = 'low-stock';
      else if (inv.quantity > inv.minThreshold * 5) status = 'overstocked';

      return {
        id: inv.id,
        sku: inv.variant.sku,
        productName: inv.variant.product.name,
        branchName: inv.branch.name,
        quantity: inv.quantity,
        minThreshold: inv.minThreshold,
        status,
      };
    });

    return {
      summary,
      items,
      meta: {
        total: totalItems,
        page,
        limit: limitParams,
        totalPages: Math.ceil(totalItems / limitParams),
      },
    };
  }

  async getLowStockItems(branchId?: string) {
    let query = this.inventoryRepo
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('inventory.branch', 'branch')
      .where('inventory.quantity <= inventory.minThreshold')
      .orderBy('inventory.quantity', 'ASC');

    if (branchId) {
      query = query.andWhere('inventory.branchId = :branchId', { branchId });
    }

    const items = await query.limit(50).getMany();

    return items.map((inv) => ({
      id: inv.id,
      sku: inv.variant.sku,
      productName: inv.variant.product.name,
      branchName: inv.branch.name,
      currentStock: inv.quantity,
      minThreshold: inv.minThreshold,
      reorderQuantity: Math.max(inv.minThreshold * 2 - inv.quantity, 0),
    }));
  }

  async getInventoryMovements(params: {
    branchId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const startDate = params.startDate
      ? moment(params.startDate).toDate()
      : moment().subtract(30, 'days').toDate();
    const endDate = params.endDate
      ? moment(params.endDate).toDate()
      : moment().toDate();

    let query = this.stockMovementRepo
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('movement.branch', 'branch')
      .leftJoinAndSelect('movement.user', 'user')
      .where('movement.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    if (params.branchId) {
      query = query.andWhere('movement.branchId = :branchId', {
        branchId: params.branchId,
      });
    }

    if (params.type && params.type !== 'all') {
      query = query.andWhere('movement.type = :type', { type: params.type });
    }

    const movements = await query
      .orderBy('movement.createdAt', 'DESC')
      .limit(100)
      .getMany();

    return movements.map((mov) => ({
      id: mov.id,
      productName: mov.variant.product.name,
      sku: mov.variant.sku,
      type: mov.type,
      quantityChange: mov.quantityChange,
      quantityBefore: mov.quantityBefore,
      quantityAfter: mov.quantityAfter,
      branchName: mov.branch.name,
      userName: mov.user?.name,
      notes: mov.notes,
      createdAt: mov.createdAt,
    }));
  }

  async getInventoryValuation(branchId?: string) {
    let query = this.inventoryRepo
      .createQueryBuilder('inventory')
      .leftJoin('inventory.variant', 'variant')
      .select('SUM(inventory.quantity * variant.costPrice)', 'totalCostValue')
      .addSelect('SUM(inventory.quantity * variant.price)', 'totalRetailValue')
      .addSelect('COUNT(DISTINCT inventory.id)', 'totalItems')
      .addSelect('SUM(inventory.quantity)', 'totalUnits');

    if (branchId) {
      query = query.where('inventory.branchId = :branchId', { branchId });
    }

    const result = await query.getRawOne();

    return {
      totalCostValue: Number(result.totalCostValue || 0),
      totalRetailValue: Number(result.totalRetailValue || 0),
      potentialProfit:
        Number(result.totalRetailValue || 0) -
        Number(result.totalCostValue || 0),
      totalItems: Number(result.totalItems || 0),
      totalUnits: Number(result.totalUnits || 0),
    };
  }

  async getInventoryTurnover(params: { period: string; branchId?: string }) {
    const { startDate, endDate } = this.getDateRange(params.period);

    // Calculate COGS (Cost of Goods Sold)
    let salesQuery = this.invoiceItemRepo
      .createQueryBuilder('item')
      .leftJoin('item.invoice', 'invoice')
      .leftJoin('item.variant', 'variant')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' })
      .select('SUM(item.quantity * variant.costPrice)', 'cogs');

    if (params.branchId) {
      salesQuery = salesQuery.andWhere('invoice.branchId = :branchId', {
        branchId: params.branchId,
      });
    }

    const salesResult = await salesQuery.getRawOne();
    const cogs = Number(salesResult.cogs || 0);

    // Calculate average inventory value
    const inventoryValue = await this.getInventoryValuation(params.branchId);
    const avgInventoryValue = inventoryValue.totalCostValue;

    // Turnover Ratio = COGS / Average Inventory
    const turnoverRatio = avgInventoryValue > 0 ? cogs / avgInventoryValue : 0;

    // Days to sell inventory = 365 / Turnover Ratio
    const daysToSell = turnoverRatio > 0 ? 365 / turnoverRatio : 0;

    return {
      turnoverRatio: Number(turnoverRatio.toFixed(2)),
      daysToSellInventory: Math.round(daysToSell),
      cogs,
      avgInventoryValue,
      period: { start: startDate, end: endDate },
    };
  }

  async getShrinkageReport(params: { period: string; branchId?: string }) {
    const { startDate, endDate } = this.getDateRange(params.period);

    let query = this.stockMovementRepo
      .createQueryBuilder('movement')
      .leftJoin('movement.variant', 'variant')
      .where('movement.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('movement.type = :type', { type: 'damage' });

    if (params.branchId) {
      query = query.andWhere('movement.branchId = :branchId', {
        branchId: params.branchId,
      });
    }

    const movements = await query
      .select('SUM(ABS(movement.quantityChange))', 'totalUnits')
      .addSelect(
        'SUM(ABS(movement.quantityChange) * variant.costPrice)',
        'totalValue',
      )
      .getRawOne();

    return {
      totalUnits: Number(movements.totalUnits || 0),
      totalValue: Number(movements.totalValue || 0),
      period: { start: startDate, end: endDate },
    };
  }

  // ==================== FINANCIAL DASHBOARD ====================

  async getFinancialSummary(params: {
    period: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { startDate, endDate } = this.getDateRange(
      params.period,
      params.startDate,
      params.endDate,
    );

    const [revenue, cogs, expenses] = await Promise.all([
      this.getTotalRevenue(startDate, endDate),
      this.getTotalCOGS(startDate, endDate),
      this.getTotalExpenses(startDate, endDate),
    ]);

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return {
      revenue,
      cogs,
      expenses,
      grossProfit,
      netProfit,
      grossMargin: Number(grossMargin.toFixed(2)),
      netMargin: Number(netMargin.toFixed(2)),
      period: { start: startDate, end: endDate },
    };
  }

  async getProfitLossStatement(params: {
    period: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.getFinancialSummary(params);
  }

  async getCashFlowAnalysis(params: {
    period: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { startDate, endDate } = this.getDateRange(
      params.period,
      params.startDate,
      params.endDate,
    );

    // Cash inflows (from sales)
    const salesQuery = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' })
      .select('invoice.paymentMethod', 'method')
      .addSelect('SUM(invoice.totalAmount)', 'amount')
      .groupBy('invoice.paymentMethod')
      .getRawMany();

    const cashInflows = salesQuery.reduce(
      (acc, item) => {
        acc[item.method || 'other'] = Number(item.amount);
        return acc;
      },
      {} as Record<string, number>,
    );

    // Cash outflows (purchases)
    const purchases = await this.getTotalExpenses(startDate, endDate);

    const totalInflow = (Object.values(cashInflows) as number[]).reduce(
      (sum, val) => sum + val,
      0,
    );
    const netCashFlow = totalInflow - purchases;

    return {
      inflows: {
        ...cashInflows,
        total: totalInflow,
      },
      outflows: {
        purchases,
        total: purchases,
      },
      netCashFlow,
      period: { start: startDate, end: endDate },
    };
  }

  async getTaxSummary(params: {
    period: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { startDate, endDate } = this.getDateRange(
      params.period,
      params.startDate,
      params.endDate,
    );

    const result = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' })
      .select('SUM(invoice.subtotal)', 'subtotal')
      .addSelect('SUM(invoice.tax)', 'totalTax')
      .addSelect('SUM(invoice.totalAmount)', 'total')
      .getRawOne();

    return {
      subtotal: Number(result.subtotal || 0),
      totalTax: Number(result.totalTax || 0),
      total: Number(result.total || 0),
      taxRate:
        Number(result.subtotal) > 0
          ? (Number(result.totalTax) / Number(result.subtotal)) * 100
          : 0,
      period: { start: startDate, end: endDate },
    };
  }

  // ==================== PRODUCT PERFORMANCE ====================

  async getTopSellingProducts(params: {
    period: string;
    branchId?: string;
    limit?: number;
    sortBy?: 'revenue' | 'quantity';
  }) {
    const { startDate, endDate } = this.getDateRange(params.period);
    const limit = params.limit || 10;
    const sortBy = params.sortBy || 'revenue';

    return this.getTopProducts(
      startDate,
      endDate,
      params.branchId,
      limit,
      sortBy,
    );
  }

  async getProductPerformance(params: { period: string; branchId?: string }) {
    const { startDate, endDate } = this.getDateRange(params.period);

    let query = this.invoiceItemRepo
      .createQueryBuilder('item')
      .leftJoin('item.invoice', 'invoice')
      .leftJoin('item.variant', 'variant')
      .leftJoin('variant.product', 'product')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' });

    if (params.branchId) {
      query = query.andWhere('invoice.branchId = :branchId', {
        branchId: params.branchId,
      });
    }

    const results = await query
      .select('product.id', 'productId')
      .addSelect('product.name', 'productName')
      .addSelect('SUM(item.quantity)', 'quantitySold')
      .addSelect('SUM(item.subtotal)', 'revenue')
      .addSelect('AVG(item.unitPrice)', 'avgPrice')
      .groupBy('product.id')
      .addGroupBy('product.name')
      .orderBy('revenue', 'DESC')
      .limit(50)
      .getRawMany();

    return results.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      quantitySold: Number(r.quantitySold),
      revenue: Number(r.revenue),
      avgPrice: Number(r.avgPrice),
    }));
  }

  async getProfitMarginByProduct(params: {
    period: string;
    branchId?: string;
  }) {
    const { startDate, endDate } = this.getDateRange(params.period);

    let query = this.invoiceItemRepo
      .createQueryBuilder('item')
      .leftJoin('item.invoice', 'invoice')
      .leftJoin('item.variant', 'variant')
      .leftJoin('variant.product', 'product')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' });

    if (params.branchId) {
      query = query.andWhere('invoice.branchId = :branchId', {
        branchId: params.branchId,
      });
    }

    const results = await query
      .select('product.id', 'productId')
      .addSelect('product.name', 'productName')
      .addSelect('SUM(item.subtotal)', 'revenue')
      .addSelect('SUM(item.quantity * variant.costPrice)', 'cost')
      .addSelect('SUM(item.quantity)', 'quantity')
      .groupBy('product.id')
      .addGroupBy('product.name')
      .getRawMany();

    return results
      .map((r) => {
        const revenue = Number(r.revenue);
        const cost = Number(r.cost);
        const profit = revenue - cost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

        return {
          productId: r.productId,
          productName: r.productName,
          revenue,
          cost,
          profit,
          margin: Number(margin.toFixed(2)),
          quantity: Number(r.quantity),
        };
      })
      .sort();
  }
  //================helper
  // ==================== HELPER FUNCTIONS ====================

  private getDateRange(
    period: string,
    startDate?: string,
    endDate?: string,
  ): { startDate: Date; endDate: Date } {
    const now = moment().endOf('day');
    let start: moment.Moment;

    switch (period) {
      case 'today':
        start = moment().startOf('day');
        break;
      case 'week':
        start = moment().startOf('week');
        break;
      case 'month':
        start = moment().startOf('month');
        break;
      case 'year':
        start = moment().startOf('year');
        break;
      case 'custom':
        start = startDate ? moment(startDate) : moment().startOf('month');
        return {
          startDate: start.toDate(),
          endDate: endDate
            ? moment(endDate).endOf('day').toDate()
            : now.toDate(),
        };
      default:
        start = moment().subtract(30, 'days').startOf('day');
    }

    return { startDate: start.toDate(), endDate: now.toDate() };
  }

  private getPreviousPeriod(
    startDate: Date,
    endDate: Date,
  ): { startDate: Date; endDate: Date } {
    const duration = moment(endDate).diff(moment(startDate), 'days');
    const prevEnd = moment(startDate).subtract(1, 'day');
    const prevStart = moment(prevEnd).subtract(duration, 'days');
    return { startDate: prevStart.toDate(), endDate: prevEnd.toDate() };
  }

  private async getPeriodData(
    startDate: Date,
    endDate: Date,
    branchId?: string,
  ) {
    let query = this.invoiceRepo
      .createQueryBuilder('invoice')
      .select('SUM(invoice.totalAmount)', 'revenue')
      .addSelect('COUNT(invoice.id)', 'orders')
      .addSelect('COUNT(DISTINCT invoice.CustomerName)', 'customers')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' });

    if (branchId) {
      query = query.andWhere('invoice.branchId = :branchId', { branchId });
    }

    const result = await query.getRawOne();

    const revenue = Number(result?.revenue || 0);
    const orders = Number(result?.orders || 0);
    const avgOrderValue = orders > 0 ? revenue / orders : 0;
    const customers = Number(result?.customers || 0);

    return { revenue, orders, avgOrderValue, customers };
  }

  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0 && current === 0) return 0;
    if (previous === 0) return 100;
    return ((current - previous) / previous) * 100;
  }

  private async getTopProducts(
    startDate: Date,
    endDate: Date,
    branchId?: string,
    limit = 5,
    sortBy: 'revenue' | 'quantity' = 'revenue',
  ) {
    let query = this.invoiceItemRepo
      .createQueryBuilder('item')
      .leftJoin('item.invoice', 'invoice')
      .leftJoin('item.variant', 'variant')
      .leftJoin('variant.product', 'product')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' });

    if (branchId) {
      query = query.andWhere('invoice.branchId = :branchId', { branchId });
    }

    const results = await query
      .select('product.id', 'productId')
      .addSelect('product.name', 'productName')
      .addSelect('SUM(item.quantity)', 'quantitySold')
      .addSelect('SUM(item.subtotal)', 'revenue')
      .groupBy('product.id')
      .addGroupBy('product.name')
      .orderBy(sortBy === 'revenue' ? 'revenue' : 'quantitySold', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      quantitySold: Number(r.quantitySold),
      revenue: Number(r.revenue),
    }));
  }

  private async getLowStockCount(branchId?: string): Promise<number> {
    let query = this.inventoryRepo
      .createQueryBuilder('inventory')
      .where('inventory.quantity <= inventory.minThreshold');

    if (branchId) {
      query = query.andWhere('inventory.branchId = :branchId', { branchId });
    }

    return query.getCount();
  }

  // ==================== FINANCIAL HELPERS ====================

  /**
   * Get total revenue from paid invoices in the period.
   */
  private async getTotalRevenue(
    startDate: Date,
    endDate: Date,
    branchId?: string,
  ): Promise<number> {
    let query = this.invoiceRepo
      .createQueryBuilder('invoice')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' });

    if (branchId) {
      query = query.andWhere('invoice.branchId = :branchId', { branchId });
    }

    const result = await query
      .select('SUM(invoice.totalAmount)', 'totalRevenue')
      .getRawOne<{ totalRevenue: string }>();

    return Number(result?.totalRevenue || 0);
  }

  /**
   * Get total expenses (e.g., purchases, salaries, rent) within the period.
   * Assuming you have a Purchase or Expense entity tracking these.
   */
  private async getTotalExpenses(
    startDate: Date,
    endDate: Date,
    branchId?: string,
  ): Promise<number> {
    // If you have a dedicated Expense entity, replace `purchaseRepo` with `expenseRepo`
    if (!this.purchaseRepo) return 0;

    let query = this.purchaseRepo
      .createQueryBuilder('purchase')
      .where('purchase.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('purchase.status = :status', { status: 'completed' });

    if (branchId) {
      query = query.andWhere('purchase.branchId = :branchId', { branchId });
    }

    const result = await query
      .select('SUM(purchase.totalAmount)', 'totalExpenses')
      .getRawOne<{ totalExpenses: string }>();

    return Number(result?.totalExpenses || 0);
  }

  /**
   * Get total COGS (Cost of Goods Sold) based on sold products' purchase cost.
   * This uses InvoiceItem + ProductVariant + Inventory data.
   */
  private async getTotalCOGS(
    startDate: Date,
    endDate: Date,
    branchId?: string,
  ): Promise<number> {
    let query = this.invoiceItemRepo
      .createQueryBuilder('item')
      .leftJoin('item.invoice', 'invoice')
      .leftJoin('item.variant', 'variant')
      .leftJoin('variant.product', 'product')
      .leftJoin('variant.inventory', 'inventory')
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('invoice.status = :status', { status: 'paid' });

    if (branchId) {
      query = query.andWhere('invoice.branchId = :branchId', { branchId });
    }

    const result = await query
      .select('SUM(item.quantity * inventory.purchasePrice)', 'totalCOGS')
      .getRawOne<{ totalCOGS: string }>();

    return Number(result?.totalCOGS || 0);
  }
}
