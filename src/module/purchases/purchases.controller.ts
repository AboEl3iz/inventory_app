import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException, UseGuards, Req, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { AuthenticationGuard } from 'src/common/guard/authentication.guard';
import { AuthorizationGuard } from 'src/common/guard/authorization.guard';
import { Role, Roles } from 'src/common/decorator/roles.decorator';

@Controller('purchases')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  /**
   * Create new purchase order
   * Only admins and managers can create purchases
   */
  @Post()
  @Roles(Role.admin, Role.manager)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePurchaseDto, @Req() req: any) {
    if (!dto.items?.length) {
      throw new BadRequestException('Purchase must contain at least one item');
    }

    const invalidItems = dto.items.filter(
      (item) => item.quantity <= 0 || item.unitCost < 0,
    );
    if (invalidItems.length > 0) {
      throw new BadRequestException(
        'All items must have positive quantity and non-negative unit cost',
      );
    }

    return this.purchasesService.createPurchase(dto, req.user);
  }

  /**
   * Get all purchases
   * Non-admin users only see purchases from their branch
   */
  @Get()
  @CacheKey('all_purchases')
  @CacheTTL(60)
  async findAll(@Req() req: any) {
    return this.purchasesService.findAll(req.user);
  }

  /**
   * Get purchase by ID
   */
  @Get(':id')
  @CacheTTL(60)
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.purchasesService.findOne(id, req.user);
  }

  /**
   * Complete purchase and update inventory
   * This action triggers stock movement
   */
  @Patch(':id/complete')
  @Roles(Role.admin, Role.manager)
  @HttpCode(HttpStatus.OK)
  async complete(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.purchasesService.completePurchase(id, req.user);
  }

  /**
   * Cancel a pending purchase
   * Cannot cancel completed purchases
   */
  @Patch(':id/cancel')
  @Roles(Role.admin, Role.manager)
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.purchasesService.cancelPurchase(id, req.user);
  }

  /**
   * Soft delete a purchase (Admin only)
   * Cannot delete completed purchases
   */
  @Delete(':id')
  @Roles(Role.admin)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.purchasesService.remove(id, req.user);
  }
}