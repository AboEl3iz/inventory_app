import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ValidationPipe, Req } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import {  DashboardQueryDto } from './dto/create-analytics.dto';
import { AuthenticationGuard } from 'src/common/guard/authentication.guard';
import { AuthorizationGuard } from 'src/common/guard/authorization.guard';
import { Role, Roles } from 'src/common/decorator/roles.decorator';
import { TrendQueryDto } from './dto/trend-query.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';

@Controller('analytics')
@UseGuards(AuthenticationGuard,AuthorizationGuard)
export class AnalyticsController {
  dashboardService: any;
  constructor(private readonly analyticsService: AnalyticsService) {}

   // ==================== OVERVIEW DASHBOARD ====================

  @Get('overview')
  @Roles(Role.admin, Role.manager)
  //////@ApiOperation({ summary: 'Get dashboard overview with KPIs' })
  //@ApiResponse({ status: 200, description: 'Dashboard overview data' })
  // @ApiQuery({ name: 'period', enum: ['today', 'week', 'month', 'year', 'custom'], required: false })
  // @ApiQuery({ name: 'branchId', required: false })
  async getOverview(
    @Query(ValidationPipe) query: DashboardQueryDto,
    @Req() req: any,
  ) {
    const branchId = req.user.role === 'manager' ? req.user.branchId : query.branchId;
    
    return {
      success: true,
      data: await this.analyticsService.getOverview({
        period: query.period || 'today',
        startDate: query.startDate,
        endDate: query.endDate,
        branchId,
      }),
    };
  }

  // @Get('kpis')
  // @Roles(Role.admin, Role.manager)
  // //////@ApiOperation({ summary: 'Get key performance indicators' })
  // //@ApiResponse({ status: 200, description: 'KPI metrics' })
  // async getKPIs(
  //   @Query(ValidationPipe) query: DashboardQueryDto,
  //  @Req() req: any,
  // ) {
  //   const branchId = req.user.role === 'manager' ? req.user.branchId : query.branchId;
    
  //   return {
  //     success: true,
  //     data: await this.analyticsService.getKPIs({
  //       period: query.period || 'today',
  //       startDate: query.startDate,
  //       endDate: query.endDate,
  //       branchId,
  //     }),
  //   };
  // }

  @Get('widgets')
  @Roles(Role.admin, Role.manager)
  //////@ApiOperation({ summary: 'Get all dashboard widgets data' })
  //@ApiResponse({ status: 200, description: 'Dashboard widgets' })
  async getWidgets(
    @Query(ValidationPipe) query: DashboardQueryDto,
    @Req() req: any,
  ) {
    const branchId = req.user.role === 'manager' ? req.user.branchId : query.branchId;
    
    return {
      success: true,
      data: await this.analyticsService.getAllWidgets({
        period: query.period || 'today',
        branchId,
      }),
    };
  }

  // ==================== SALES ANALYTICS ====================

  @Get('sales/trends')
  @Roles(Role.admin, Role.manager)
  //////@ApiOperation({ summary: 'Get sales trends over time' })
  //@ApiResponse({ status: 200, description: 'Sales trend data' })
  async getSalesTrends(
    @Query(ValidationPipe) query: TrendQueryDto,
    @Req() req: any,
  ) {
    const branchId = req.user.role === 'manager' ? req.user.branchId : query.branchId;
    
    return {
      success: true,
      data: await this.analyticsService.getSalesTrends({
        groupBy: query.groupBy || 'day',
        startDate: query.startDate,
        endDate: query.endDate,
        branchId,
      }),
    };
  }

  @Get('sales/by-category')
  @Roles(Role.admin, Role.manager)
  //////@ApiOperation({ summary: 'Get sales breakdown by category' })
  //@ApiResponse({ status: 200, description: 'Sales by category' })
  async getSalesByCategory(
    @Query(ValidationPipe) query: DashboardQueryDto,
     @Req() req: any,
  ) {
    const branchId = req.user.role === 'manager' ? req.user.branchId : query.branchId;
    
    return {
      success: true,
      data: await this.analyticsService.getSalesByCategory({
        period: query.period || 'month',
        branchId,
      }),
    };
  }

  @Get('sales/by-branch')
  @Roles(Role.admin)
  //////@ApiOperation({ summary: 'Get sales comparison across branches' })
  //@ApiResponse({ status: 200, description: 'Sales by branch' })
  async getSalesByBranch(@Query(ValidationPipe) query: DashboardQueryDto) {
    return {
      success: true,
      data: await this.analyticsService.getSalesByBranch({
        period: query.period || 'month',
      }),
    };
  }

  @Get('sales/by-user')
  @Roles(Role.admin, Role.manager)
  //////@ApiOperation({ summary: 'Get sales performance by user/cashier' })
  //@ApiResponse({ status: 200, description: 'Sales by user' })
  async getSalesByUser(
    @Query(ValidationPipe) query: DashboardQueryDto,
     @Req() req: any,
  ) {
    const branchId = req.user.role === 'manager' ? req.user.branchId : query.branchId;
    
    return {
      success: true,
      data: await this.analyticsService.getSalesByUser({
        period: query.period || 'month',
        branchId,
      }),
    };
  }

//   @Get('sales/payment-methods')
//   @Roles(Role.admin, Role.manager)
//   //////@ApiOperation({ summary: 'Get payment methods distribution' })
//   //@ApiResponse({ status: 200, description: 'Payment methods breakdown' })
//   async getPaymentMethods(
//     @Query(ValidationPipe) query: DashboardQueryDto,
//     @Req() req: any,
//   ) {
//     const branchId = req.user.role === 'manager' ? req.user.branchId : query.branchId;
    
//     return {
//       success: true,
//       data: await this.dashboardService.getPaymentMethodsBreakdown({
//         period: query.period || 'month',
//         branchId,
//       }),
//     };
//   }

//   @Get('sales/peak-hours')
// @Roles(Role.admin, Role.manager)
//   //////@ApiOperation({ summary: 'Get peak sales hours analysis' })
//   //@ApiResponse({ status: 200, description: 'Peak hours data' })
//   async getPeakHours(
//     @Query(ValidationPipe) query: DashboardQueryDto,
//      @Req() req: any,
//   ) {
//     const branchId = req.user.role === 'manager' ? req.user.branchId : query.branchId;
    
//     return {
//       success: true,
//       data: await this.dashboardService.getPeakHoursAnalysis({
//         period: query.period || 'week',
//         branchId,
//       }),
//     };
//   }

  // ==================== INVENTORY DASHBOARD ====================

  @Get('inventory/status')
  @Roles(Role.admin, Role.manager)
  //////@ApiOperation({ summary: 'Get inventory status overview' })
  //@ApiResponse({ status: 200, description: 'Inventory status' })
  async getInventoryStatus(
    @Query(ValidationPipe) query: InventoryQueryDto,
     @Req() req: any,
  ) {
    const branchId = req.user.role === 'manager' ? req.user.branchId : query.branchId;
    
    return {
      success: true,
      data: await this.analyticsService.getInventoryStatus({
        branchId,
        status: query.status || 'all',
      }),
    };
  }

  @Get('inventory/low-stock')
  @Roles(Role.admin, Role.manager)
  //////@ApiOperation({ summary: 'Get low stock items' })
  //@ApiResponse({ status: 200, description: 'Low stock items list' })
  async getLowStockItems(
    @Query('branchId') branchId: string,
     @Req() req: any,
  ) {
    const effectiveBranchId = req.user.role === 'manager' ? req.user.branchId : branchId;
    
    return {
      success: true,
      data: await this.analyticsService.getLowStockItems(effectiveBranchId),
    };
  }

  @Get('inventory/movements')
  @Roles(Role.admin, Role.manager)
  //////@ApiOperation({ summary: 'Get inventory movements history' })
  //@ApiResponse({ status: 200, description: 'Inventory movements' })
  // @ApiQuery({ name: 'type', enum: ['all', 'sale', 'purchase', 'adjustment', 'transfer', 'damage'], required: false })
  async getInventoryMovements(
    @Query(ValidationPipe) query: DashboardQueryDto,
    @Query('type') type: string,
     @Req() req: any,
  ) {
    const branchId = req.user.role === 'manager' ? req.user.branchId : query.branchId;
    
    return {
      success: true,
      data: await this.analyticsService.getInventoryMovements({
        branchId,
        type,
        startDate: query.startDate,
        endDate: query.endDate,
      }),
    };
  }

  @Get('inventory/valuation')
  @Roles(Role.admin, Role.manager)
  //////@ApiOperation({ summary: 'Get inventory valuation' })
  //@ApiResponse({ status: 200, description: 'Inventory value' })
  async getInventoryValuation(
    @Query('branchId') branchId: string,
     @Req() req: any,
  ) {
    const effectiveBranchId = req.user.role === 'manager' ? req.user.branchId : branchId;
    
    return {
      success: true,
      data: await this.analyticsService.getInventoryValuation(effectiveBranchId),
    };
  }

  @Get('inventory/turnover')
  @Roles(Role.admin, Role.manager)
  //////@ApiOperation({ summary: 'Get inventory turnover ratio' })
  //@ApiResponse({ status: 200, description: 'Turnover metrics' })
  async getInventoryTurnover(
    @Query(ValidationPipe) query: DashboardQueryDto,
     @Req() req: any,
  ) {
    const branchId = req.user.role === 'manager' ? req.user.branchId : query.branchId;
    
    return {
      success: true,
      data: await this.analyticsService.getInventoryTurnover({
        period: query.period || 'month',
        branchId,
      }),
    };
  }

  // @Get('inventory/shrinkage')
  // @Roles(Role.admin, Role.manager)
  // ////@ApiOperation({ summary: 'Get shrinkage/damage report' })
  // //@ApiResponse({ status: 200, description: 'Shrinkage data' })
  // async getShrinkage(
  //   @Query(ValidationPipe) query: DashboardQueryDto,
  //    @Req() req: any,
  // ) {
  //   const branchId = req.user.role === 'manager' ? req.user.branchId : query.branchId;
    
  //   return {
  //     success: true,
  //     data: await this.dashboardService.getShrinkageReport({
  //       period: query.period || 'month',
  //       branchId,
  //     }),
  //   };
  // }

  // ==================== FINANCIAL DASHBOARD ====================

  @Get('financial/summary')
  @Roles(Role.admin)
  ////@ApiOperation({ summary: 'Get financial summary' })
  //@ApiResponse({ status: 200, description: 'Financial overview' })
  async getFinancialSummary(@Query(ValidationPipe) query: DashboardQueryDto) {
    return {
      success: true,
      data: await this.analyticsService.getFinancialSummary({
        period: query.period || 'month',
        startDate: query.startDate,
        endDate: query.endDate,
      }),
    };
  }

  @Get('financial/profit-loss')
  @Roles(Role.admin)
  ////@ApiOperation({ summary: 'Get profit & loss statement' })
  //@ApiResponse({ status: 200, description: 'P&L data' })
  async getProfitLoss(@Query(ValidationPipe) query: DashboardQueryDto) {
    return {
      success: true,
      data: await this.analyticsService.getProfitLossStatement({
        period: query.period || 'month',
        startDate: query.startDate,
        endDate: query.endDate,
      }),
    };
  }

  @Get('financial/cash-flow')
  @Roles(Role.admin)
  ////@ApiOperation({ summary: 'Get cash flow analysis' })
  //@ApiResponse({ status: 200, description: 'Cash flow data' })
  async getCashFlow(@Query(ValidationPipe) query: DashboardQueryDto) {
    return {
      success: true,
      data: await this.dashboardService.getCashFlowAnalysis({
        period: query.period || 'month',
        startDate: query.startDate,
        endDate: query.endDate,
      }),
    };
  }

  @Get('financial/tax-summary')
  @Roles(Role.admin)
  ////@ApiOperation({ summary: 'Get tax summary' })
  //@ApiResponse({ status: 200, description: 'Tax data' })
  async getTaxSummary(@Query(ValidationPipe) query: DashboardQueryDto) {
    return {
      success: true,
      data: await this.dashboardService.getTaxSummary({
        period: query.period || 'month',
        startDate: query.startDate,
        endDate: query.endDate,
      }),
    };
  }

  // ==================== PRODUCT PERFORMANCE ====================

  @Get('products/top-selling')
  @Roles(Role.admin, Role.manager)
  ////@ApiOperation({ summary: 'Get top selling products' })
  //@ApiResponse({ status: 200, description: 'Top products list' })
  // @ApiQuery({ name: 'limit', required: false })
  // @ApiQuery({ name: 'sortBy', enum: ['revenue', 'quantity'], required: false })
  async getTopSellingProducts(
    @Query(ValidationPipe) query: DashboardQueryDto,
    @Query('limit') limit: number = 10,
    @Query('sortBy') sortBy: 'revenue' | 'quantity' = 'revenue',
     @Req() req: any,
  ) {
    const branchId = req.user.role === 'manager' ? req.user.branchId : query.branchId;
    
    return {
      success: true,
      data: await this.analyticsService.getTopSellingProducts({
        period: query.period || 'month',
        branchId,
        limit,
        sortBy,
      }),
    };
  }

  @Get('products/performance')
  @Roles(Role.admin, Role.manager)
  ////@ApiOperation({ summary: 'Get product performance metrics' })
  //@ApiResponse({ status: 200, description: 'Product performance' })
  async getProductPerformance(
    @Query(ValidationPipe) query: DashboardQueryDto,
     @Req() req: any,
  ) {
    const branchId = req.user.role === 'manager' ? req.user.branchId : query.branchId;
    
    return {
      success: true,
      data: await this.analyticsService.getProductPerformance({
        period: query.period || 'month',
        branchId,
      }),
    };
  }

  @Get('products/profit-margin')
  @Roles(Role.admin, Role.manager)
  ////@ApiOperation({ summary: 'Get profit margin by product' })
  //@ApiResponse({ status: 200, description: 'Profit margin data' })
  async getProfitMarginByProduct(
    @Query(ValidationPipe) query: DashboardQueryDto,
     @Req() req: any,
  ) {
    const branchId = req.user.role === 'manager' ? req.user.branchId : query.branchId;
    
    return {
      success: true,
      data: await this.analyticsService.getProfitMarginByProduct({
        period: query.period || 'month',
        branchId,
      }),
    };
  }

  // @Get('products/abc-analysis')
  // @Roles(Role.admin, Role.manager)
  // ////@ApiOperation({ summary: 'Get ABC inventory analysis' })
  // //@ApiResponse({ status: 200, description: 'ABC analysis data' })
  // async getABCAnalysis(
  //   @Query('branchId') branchId: string,
  //    @Req() req: any,
  // ) {
  //   const effectiveBranchId = req.user.role === 'manager' ? req.user.branchId : branchId;
    
  //   return {
  //     success: true,
  //     data: await this.analyticsService.getABCAnalysis(effectiveBranchId),
  //   };
  // }

  // ==================== ANALYTICS & FORECASTING ====================

  // @Get('analytics/forecasting')
  // @Roles('admin')
  // ////@ApiOperation({ summary: 'Get sales forecasting' })
  // //@ApiResponse({ status: 200, description: 'Forecast data' })
  // @ApiQuery({ name: 'weeks', required: false })
  // async getSalesForecasting(@Query('weeks') weeks: number = 4) {
  //   return {
  //     success: true,
  //     data: await this.dashboardService.getSalesForecasting(weeks),
  //   };
  // }

  // @Get('analytics/customer-insights')
  // @Roles(Role.admin, Role.manager)
  // ////@ApiOperation({ summary: 'Get customer analytics' })
  // //@ApiResponse({ status: 200, description: 'Customer insights' })
  // async getCustomerInsights(
  //   @Query(ValidationPipe) query: DashboardQueryDto,
  //    @Req() req: any,
  // ) {
  //   const branchId = req.user.role === 'manager' ? req.user.branchId : query.branchId;
    
  //   return {
  //     success: true,
  //     data: await this.dashboardService.getCustomerInsights({
  //       period: query.period || 'month',
  //       branchId,
  //     }),
  //   };
  // }

  // @Get('analytics/comparative')
  // @Roles('admin')
  // ////@ApiOperation({ summary: 'Get comparative analysis (YoY, MoM)' })
  // //@ApiResponse({ status: 200, description: 'Comparative data' })
  // async getComparativeAnalysis(@Query(ValidationPipe) query: DashboardQueryDto) {
  //   return {
  //     success: true,
  //     data: await this.dashboardService.getComparativeAnalysis({
  //       period: query.period || 'month',
  //     }),
  //   };
  // }

  // ==================== BRANCHES COMPARISON ====================

  // @Get('branches/comparison')
  // @Roles(Role.admin)
  // ////@ApiOperation({ summary: 'Compare performance across branches' })
  // //@ApiResponse({ status: 200, description: 'Branch comparison' })
  // async getBranchesComparison(@Query(ValidationPipe) query: DashboardQueryDto) {
  //   return {
  //     success: true,
  //     data: await this.analyticsService.getBranchesComparison({
  //       period: query.period || 'month',
  //     }),
  //   };
  // }

  // @Get('branches/:id/metrics')
  // @Roles(Role.admin)
  // ////@ApiOperation({ summary: 'Get detailed metrics for specific branch' })
  // //@ApiResponse({ status: 200, description: 'Branch metrics' })
  // async getBranchMetrics(
  //   @Param('id') branchId: string,
  //   @Query(ValidationPipe) query: DashboardQueryDto,
  // ) {
  //   return {
  //     success: true,
  //     data: await this.analyticsService.getBranchMetrics({
  //       branchId,
  //       period: query.period || 'month',
  //     }),
  //   };
  // }

  // ==================== REAL-TIME DATA ====================

  // @Get('realtime/current-sales')
  // @Roles(Role.admin, Role.manager)
  // //////@ApiOperation({ summary: 'Get real-time current day sales' })
  // //@ApiResponse({ status: 200, description: 'Real-time sales data' })
  // async getCurrentSales(
  //   @Query('branchId') branchId: string,
  //    @Req() req: any,
  // ) {
  //   const effectiveBranchId = user.role === 'manager' ? user.branchId : branchId;
    
  //   return {
  //     success: true,
  //     data: await this.dashboardService.getRealTimeSales(effectiveBranchId),
  //   };
  // }

  // @Get('realtime/active-users')
  // @Roles(Role.admin, Role.manager)
  // //////@ApiOperation({ summary: 'Get currently active cashiers' })
  // //@ApiResponse({ status: 200, description: 'Active users' })
  // async getActiveUsers(@CurrentUser() user: any) {
  //   const branchId = user.role === 'manager' ? user.branchId : null;
    
  //   return {
  //     success: true,
  //     data: await this.dashboardService.getActiveUsers(branchId),
  //   };
  // }

  // ==================== EXPORT ENDPOINTS ====================

  // @Get('export/sales-report')
  // @Roles(Role.admin, Role.manager)
  // // //////@ApiOperation({ summary: 'Export sales report as CSV/PDF' })
  // // @ApiQuery({ name: 'format', enum: ['csv', 'pdf', 'excel'], required: false })
  // async exportSalesReport(
  //   @Query(ValidationPipe) query: DashboardQueryDto,
  //   @Query('format') format: 'csv' | 'pdf' | 'excel' = 'csv',
  //   @Req() req: any,
  // ) {
  //   const branchId = req.user.role === 'manager' ? req.user.branchId : query.branchId;
    
  //   const data = await this.dashboardService.exportSalesReport({
  //     period: query.period || 'month',
  //     branchId,
  //     format,
  //   });

  //   return {
  //     success: true,
  //     data,
  //   };
  // }
}

