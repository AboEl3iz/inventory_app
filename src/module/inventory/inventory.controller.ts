import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { Roles, Role } from 'src/common/decorator/roles.decorator';
import { AuthenticationGuard } from 'src/common/guard/authentication.guard';
import { AuthorizationGuard } from 'src/common/guard/authorization.guard';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';

@Controller('inventory')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * 🟢 إنشاء أو تعديل المخزون
   */
  @Post()
  @Roles(Role.admin, Role.manager)
  create(@Body() dto: CreateInventoryDto, @Req() req) {
    return this.inventoryService.create(dto, req.user);
  }

  /**
   * 🟢 عرض كل المخزون (حسب الصلاحية)
   */
  @Get()
  @Roles(Role.admin, Role.manager, Role.cashier)
  findAll(@Req() req, @Query('branchId') branchId?: string) {
    return this.inventoryService.findAll(req.user, branchId);
  }

  /**
   * 🟢 عرض سجل معين من المخزون
   */
  @Get(':id')
  @Roles(Role.admin, Role.manager, Role.cashier)
  findOne(@Param('id') id: string, @Req() req) {
    return this.inventoryService.findOne(id, req.user);
  }

  /**
   * 🟢 تعديل بيانات المخزون (threshold / quantity ...)
   */
  @Patch(':id')
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
  @Roles(Role.admin, Role.manager, Role.cashier)
  getLowStock(@Req() req, @Query('threshold') threshold = 5) {
    return this.inventoryService.getLowStock(req.user, Number(threshold));
  }

  /**
   * 🟢 تعديل كمية المخزون يدويًا (زيادة / نقص)
   */
  @Post('adjust')
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
