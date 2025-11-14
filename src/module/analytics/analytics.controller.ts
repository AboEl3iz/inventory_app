import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ValidationPipe, Req } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import {  DashboardQueryDto } from './dto/create-analytics.dto';
import { AuthenticationGuard } from 'src/common/guard/authentication.guard';
import { AuthorizationGuard } from 'src/common/guard/authorization.guard';
import { Role, Roles } from 'src/common/decorator/roles.decorator';
import { TrendQueryDto } from './dto/trend-query.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { ApiResponse , ApiOperation , ApiQuery } from '@nestjs/swagger';

@Controller('analytics')
@UseGuards()
@UseGuards(AuthenticationGuard,AuthorizationGuard)
export class AnalyticsController {
  dashboardService: any;
  constructor(private readonly analyticsService: AnalyticsService) {}

   // ==================== OVERVIEW DASHBOARD ====================

  @Get('overview')
  @Roles(Role.admin, Role.manager)
  @ApiOperation({ summary: 'Get dashboard overview with KPIs' })
  @ApiResponse({ status: 200, description: 'Dashboard overview data' })
  @ApiQuery({ name: 'period', enum: ['today', 'week', 'month', 'year', 'custom'], required: false })
  @ApiQuery({ name: 'branchId', required: false })
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

  

  @Get('widgets')
  @Roles(Role.admin, Role.manager)
  @ApiOperation({ summary: 'Get all dashboard widgets data' })
  @ApiResponse({ status: 200, description: 'Dashboard widgets'   })
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
  @ApiOperation({ summary: 'Get sales trends over time' })
  @ApiResponse({ status: 200, description: 'Sales trend data' })
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
  @ApiOperation({ summary: 'Get sales breakdown by category' })
  @ApiResponse({ status: 200, description: 'Sales by category' })
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
  @ApiOperation({ summary: 'Get sales comparison across branches' })
  @ApiResponse({ status: 200, description: 'Sales by branch' })
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
  @ApiOperation({ summary: 'Get sales performance by user/cashier' })
  @ApiResponse({ status: 200, description: 'Sales by user' })
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


  // ==================== INVENTORY DASHBOARD ====================

  @Get('inventory/status')
  @Roles(Role.admin, Role.manager)
  @ApiOperation({ summary: 'Get inventory status overview' })
  @ApiResponse({ status: 200, description: 'Inventory status' })
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
  @ApiOperation({ summary: 'Get low stock items' })
  @ApiResponse({ status: 200, description: 'Low stock items list' })
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
  @ApiOperation({ summary: 'Get inventory movements history' })
  @ApiResponse({ status: 200, description: 'Inventory movements' })
  @ApiQuery({ name: 'type', enum: ['all', 'sale', 'purchase', 'adjustment', 'transfer', 'damage'], required: false })
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
  @ApiOperation({ summary: 'Get inventory valuation' })
  @ApiResponse({ status: 200, description: 'Inventory value' })
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
  @ApiOperation({ summary: 'Get inventory turnover ratio' })
  @ApiResponse({ status: 200, description: 'Turnover metrics' })
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

  
  // ==================== PRODUCT PERFORMANCE ====================

  @Get('products/top-selling')
  @Roles(Role.admin, Role.manager)
  @ApiOperation({ summary: 'Get top selling products' })
  @ApiResponse({ status: 200, description: 'Top products list' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', enum: ['revenue', 'quantity'], required: false })
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
  @ApiOperation({ summary: 'Get product performance metrics' })
  @ApiResponse({ status: 200, description: 'Product performance' })
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
  @ApiOperation({ summary: 'Get profit margin by product' })
  @ApiResponse({ status: 200, description: 'Profit margin data' })
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

  
}

