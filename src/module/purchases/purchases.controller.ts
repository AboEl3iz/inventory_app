import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  UseGuards,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { AuthenticationGuard } from 'src/common/guard/authentication.guard';
import { AuthorizationGuard } from 'src/common/guard/authorization.guard';
import { Role, Roles } from 'src/common/decorator/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@Controller('purchases')
@ApiTags('Purchases')
@ApiBearerAuth('access-token')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  /**
   * Create new purchase order
   * Only admins and managers can create purchases
   */
  @Post()
  @ApiOperation({
    summary: 'Create purchase',
    description:
      'Create a new purchase order with items. Only admin and manager can perform this action.',
  })
  @ApiResponse({ status: 201, description: 'Purchase created successfully' })
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
  @ApiOperation({
    summary: 'Get all purchases',
    description: 'Retrieve all purchase orders based on user role',
  })
  @ApiResponse({ status: 200, description: 'Purchases retrieved successfully' })
  @CacheKey('all_purchases')
  @CacheTTL(60)
  async findAll(@Req() req: any) {
    return this.purchasesService.findAll(req.user);
  }

  /**
   * Get purchase by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get purchase by ID',
    description: 'Retrieve a specific purchase order',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Purchase UUID' })
  @ApiResponse({ status: 200, description: 'Purchase retrieved successfully' })
  @CacheTTL(60)
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.purchasesService.findOne(id, req.user);
  }

  /**
   * Complete purchase and update inventory
   * This action triggers stock movement
   */
  @Patch(':id/complete')
  @ApiOperation({
    summary: 'Complete purchase',
    description:
      'Complete a purchase and update inventory. Only admin and manager can perform this action.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Purchase UUID' })
  @ApiResponse({ status: 200, description: 'Purchase completed successfully' })
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
  @ApiOperation({
    summary: 'Cancel purchase',
    description:
      'Cancel a pending purchase. Only admin and manager can perform this action.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Purchase UUID' })
  @ApiResponse({ status: 200, description: 'Purchase cancelled successfully' })
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
  @ApiOperation({
    summary: 'Delete purchase',
    description: 'Delete a purchase. Only admin can perform this action.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Purchase UUID' })
  @ApiResponse({ status: 200, description: 'Purchase deleted successfully' })
  @Roles(Role.admin)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.purchasesService.remove(id, req.user);
  }
}
