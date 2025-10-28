import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException, UseGuards, Req } from '@nestjs/common';
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
   * Admin and branch managers can create a purchase
   */
  @Post()
  @Roles(Role.admin, Role.manager)
  async create(@Body() dto: CreatePurchaseDto, @Req() user: any) {
    if (!dto.items?.length)
      throw new BadRequestException('Purchase items are required');
    return this.purchasesService.createPurchase(dto, user);
  }

  /**
   * Everyone (with valid JWT) can view purchases
   */
  @Get()
  @CacheKey('all_purchases')
  @CacheTTL(60)
  async findAll(@Req() user: any) {
    return this.purchasesService.findAll(user);
  }

  @Get(':id')
  @CacheTTL(60)
  async findOne(@Param('id') id: string, @Req() user: any) {
    return this.purchasesService.findOne(id, user);
  }

  /**
   * Only admins or branch managers can mark a purchase as completed
   */
  @Patch(':id/complete')
  @Roles(Role.admin, Role.manager)
  async complete(@Param('id') id: string, @Req() user: any) {
    return this.purchasesService.completePurchase(id, user);
  }

  /**
   * Only admins can delete purchases
   */
  @Delete(':id')
  @Roles(Role.admin)
  async remove(@Param('id') id: string, @Req() user: any) {
    return this.purchasesService.remove(id, user);
  }
}