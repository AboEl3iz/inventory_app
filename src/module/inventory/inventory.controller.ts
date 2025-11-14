import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { Roles, Role } from 'src/common/decorator/roles.decorator';
import { AuthenticationGuard } from 'src/common/guard/authentication.guard';
import { AuthorizationGuard } from 'src/common/guard/authorization.guard';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@Controller('inventory')
@ApiTags('Inventory')
@ApiBearerAuth('access-token')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * 🟢 إنشاء أو تعديل المخزون
   */
  @Post()
  @ApiOperation({ summary: 'Create inventory record', description: 'Create a new inventory record. Only admin and manager can perform this action.' })
  @ApiResponse({ status: 201, description: 'Inventory record created successfully' })
  @Roles(Role.admin, Role.manager)
  create(@Body() dto: CreateInventoryDto, @Req() req) {
    return this.inventoryService.create(dto, req.user);
  }

  /**
   * 🟢 عرض كل المخزون (حسب الصلاحية)
   */
  @Get()
  @ApiOperation({ summary: 'Get all inventory records', description: 'Retrieve all inventory records based on user role' })
  @ApiQuery({ name: 'branchId', type: 'string', required: false, description: 'Filter by branch UUID' })
  @ApiResponse({ status: 200, description: 'Inventory records retrieved successfully' })
  @Roles(Role.admin, Role.manager, Role.cashier)
  findAll(@Req() req, @Query('branchId') branchId?: string) {
    return this.inventoryService.findAll(req.user, branchId);
  }

  /**
   * 🟢 عرض سجل معين من المخزون
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get inventory record by ID', description: 'Retrieve a specific inventory record' })
  @ApiParam({ name: 'id', type: 'string', description: 'Inventory UUID' })
  @ApiResponse({ status: 200, description: 'Inventory record retrieved successfully' })
  @Roles(Role.admin, Role.manager, Role.cashier)
  findOne(@Param('id') id: string, @Req() req) {
    return this.inventoryService.findOne(id, req.user);
  }

  /**
   * 🟢 تعديل بيانات المخزون (threshold / quantity ...)
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update inventory record', description: 'Update inventory data like threshold and quantity' })
  @ApiParam({ name: 'id', type: 'string', description: 'Inventory UUID' })
  @ApiResponse({ status: 200, description: 'Inventory record updated successfully' })
  @Roles(Role.admin, Role.manager)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryDto,
    @Req() req,
  ) {
    return this.inventoryService.update(id, dto, req.user);
  }

  /**
   * 🟡 المنتجات ذات المخزون القليل
   */
  @Get('status/low-stock')
  @ApiOperation({ summary: 'Get low stock items', description: 'Retrieve products with inventory below threshold' })
  @ApiQuery({ name: 'threshold', type: 'number', required: false, description: 'Stock threshold (default: 5)' })
  @ApiResponse({ status: 200, description: 'Low stock items retrieved successfully' })
  @Roles(Role.admin, Role.manager, Role.cashier)
  getLowStock(@Req() req, @Query('threshold') threshold = 5) {
    return this.inventoryService.getLowStock(req.user, Number(threshold));
  }

  /**
   * 🟢 تعديل كمية المخزون يدويًا (زيادة / نقص)
   */
  @Post('adjust')
  @ApiOperation({ summary: 'Adjust inventory quantity', description: 'Manually adjust inventory quantity (increase/decrease)' })
  @ApiResponse({ status: 200, description: 'Inventory adjusted successfully' })
  @Roles(Role.admin, Role.manager, Role.cashier)
  adjustStock(
    @Body()
    body: AdjustStockDto,
    @Req() req,
  ) {
    const { branchId, variantId, qtyChange } = body;
    return this.inventoryService.adjustStock(branchId, variantId, qtyChange, req.user);
  }

  /**
   * 🔁 نقل المخزون بين الفروع
   */
  @Post('transfer')
  @ApiOperation({ summary: 'Transfer stock between branches', description: 'Transfer inventory from one branch to another' })
  @ApiResponse({ status: 200, description: 'Stock transferred successfully' })
  @Roles(Role.admin, Role.manager)
  transferStock(
    @Body()
    body: TransferStockDto,
    @Req() req,
  ) {
    const { fromBranchId, toBranchId, variantId, qty } = body;
    return this.inventoryService.transferStock(
      fromBranchId,
      toBranchId,
      variantId,
      qty,
      req.user,
    );
  }
}
