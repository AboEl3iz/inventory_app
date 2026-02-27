import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Inventory } from './entities/inventory.entity';
import { STOCK_ADJUSTED } from 'src/shared/event.constants';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Role } from 'src/common/decorator/roles.decorator';
import { StockMovement } from '../stock/entities/stock.entity';
import {
  AdjustStockResponse,
  CreateInventoryResponse,
  InventoryDetailResponse,
  InventoryListItemResponse,
  LowStockItemResponse,
  TransferStockResponse,
  UpdateInventoryResponse,
} from 'src/shared/interfaces/inventory-response';
import { IUserPayload } from 'src/shared/interfaces/user-payload.interface';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly invRepo: Repository<Inventory>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private cacheKey(branchId?: string) {
    return branchId ? `inventory:branch:${branchId}` : 'inventory:all';
  }

  private async findBranchOrThrow(id: string) {
    const branch = await this.branchRepo.findOneBy({ id });
    if (!branch) throw new NotFoundException(`Branch ${id} not found`);
    return branch;
  }

  private async findVariantOrThrow(id: string) {
    const variant = await this.variantRepo.findOneBy({ id });
    if (!variant) throw new NotFoundException(`Variant ${id} not found`);
    return variant;
  }

  private checkBranchAccess(user: IUserPayload, branchId: string) {
    if (user.role === Role.admin) return;
    if (user.branchId !== branchId)
      throw new ForbiddenException(
        'You are not allowed to access this branch inventory',
      );
  }

  private async recordMovement(params: {
    branchId: string;
    variantId: string;
    userId: string;
    type: 'sale' | 'purchase' | 'adjustment' | 'return' | 'transfer' | 'damage';
    quantityBefore: number;
    quantityAfter: number;
    quantityChange: number;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
  }) {
    const { branchId, variantId, userId, ...rest } = params;
    const movement = this.movementRepo.create({
      branch: { id: branchId } as any,
      variant: { id: variantId } as any,
      user: { id: userId } as any,
      ...rest,
    });
    await this.movementRepo.save(movement);
  }

  getStockStatus(
    quantity: number,
    minThreshold: number,
  ): 'out_of_stock' | 'low_stock' | 'in_stock' | 'overstocked' {
    if (quantity === 0) return 'out_of_stock';
    if (quantity <= minThreshold) return 'low_stock';
    if (quantity > minThreshold * 10) return 'overstocked';
    return 'in_stock';
  }

  async create(
    dto: CreateInventoryDto,
    user: IUserPayload,
  ): Promise<CreateInventoryResponse> {
    this.checkBranchAccess(user, dto.branchId);

    const branch = await this.findBranchOrThrow(dto.branchId);
    const variant = await this.findVariantOrThrow(dto.variantId);

    // Load variant with product relation
    const variantWithProduct = await this.variantRepo.findOne({
      where: { id: variant.id },
      relations: ['product'],
    });

    if (!variantWithProduct)
      throw new NotFoundException(`Variant ${variant.id} not found`);

    let record = await this.invRepo.findOne({
      where: { branch: { id: branch.id }, variant: { id: variant.id } },
    });

    let before = 0;
    if (!record) {
      record = this.invRepo.create({
        branch,
        variant,
        quantity: dto.quantity,
        minThreshold: dto.minThreshold ?? 0,
      });
    } else {
      before = record.quantity;
      record.quantity += dto.quantity;
      if (dto.minThreshold !== undefined)
        record.minThreshold = dto.minThreshold;
    }

    const saved = await this.invRepo.save(record);

    await this.recordMovement({
      branchId: branch.id,
      variantId: variant.id,
      userId: user.id,
      type: 'purchase',
      quantityBefore: before,
      quantityAfter: saved.quantity,
      quantityChange: dto.quantity,
    });

    await this.invalidateCaches(branch.id);

    return {
      id: saved.id,
      branchId: branch.id,
      branchName: branch.name,
      variantId: variant.id,
      variantSku: variantWithProduct.sku,
      productName: variantWithProduct.product.name,
      quantity: saved.quantity,
      minThreshold: saved.minThreshold,
      lowStockAlertSent: saved.lowStockAlertSent,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async adjustStock(
    branchId: string,
    variantId: string,
    qtyChange: number,
    user: IUserPayload,
  ): Promise<AdjustStockResponse> {
    // ✅ Skip branch access check for system operations (like invoice processing)
    const isSystemOperation = user?.isSystemOperation === true;

    if (!isSystemOperation) {
      this.checkBranchAccess(user, branchId);

      // Cashiers cannot manually increase stock
      if (user.role === Role.cashier && qtyChange > 0)
        throw new ForbiddenException('Cashier cannot manually increase stock');
    }

    const branch = await this.findBranchOrThrow(branchId);
    const variant = await this.variantRepo.findOne({
      where: { id: variantId },
      relations: ['product'],
    });
    if (!variant) throw new NotFoundException(`Variant ${variantId} not found`);

    let inv = await this.invRepo.findOne({
      where: { branch: { id: branch.id }, variant: { id: variant.id } },
    });

    const before = inv?.quantity ?? 0;
    if (!inv) {
      inv = this.invRepo.create({
        branch,
        variant,
        quantity: 0,
        minThreshold: 10,
      });
    }

    inv.quantity = Math.max(inv.quantity + qtyChange, 0);

    const saved = await this.invRepo.save(inv);

    // Determine movement type and notes based on context
    let movementType:
      | 'sale'
      | 'purchase'
      | 'adjustment'
      | 'return'
      | 'transfer'
      | 'damage';
    let notes: string;

    if (isSystemOperation) {
      // System operation (invoice/purchase processing)
      movementType = qtyChange < 0 ? 'sale' : 'return';
      notes =
        qtyChange < 0
          ? 'Stock decreased due to invoice creation'
          : 'Stock restored due to invoice cancellation';
    } else {
      // Manual adjustment
      movementType = 'adjustment';
      notes = 'Manual stock adjustment';
    }

    await this.recordMovement({
      branchId,
      variantId,
      userId: user.id,
      type: movementType,
      quantityBefore: before,
      quantityAfter: saved.quantity,
      quantityChange: qtyChange,
      notes,
    });

    await this.invalidateCaches(branch.id);

    return {
      id: saved.id,
      branchId: branch.id,
      branchName: branch.name,
      variantId: variant.id,
      variantSku: variant.sku,
      productName: variant.product.name,
      quantityBefore: before,
      quantityAfter: saved.quantity,
      quantityChange: qtyChange,
      minThreshold: saved.minThreshold,
      updatedAt: saved.updatedAt,
    };
  }

  async transferStock(
    fromBranchId: string,
    toBranchId: string,
    variantId: string,
    qty: number,
    user: IUserPayload,
  ): Promise<TransferStockResponse> {
    if (![Role.admin, Role.manager].includes(user.role))
      throw new ForbiddenException('Only admin or manager can transfer stock');

    this.checkBranchAccess(user, fromBranchId);
    if (fromBranchId === toBranchId)
      throw new BadRequestException('Cannot transfer within same branch');

    return this.invRepo.manager.transaction(async (manager) => {
      const from = await manager.findOne(Inventory, {
        where: { branch: { id: fromBranchId }, variant: { id: variantId } },
        relations: ['branch', 'variant'],
      });
      if (!from || from.quantity < qty)
        throw new BadRequestException('Insufficient stock to transfer');

      const beforeFrom = from.quantity;
      from.quantity -= qty;
      await manager.save(from);

      let to = await manager.findOne(Inventory, {
        where: { branch: { id: toBranchId }, variant: { id: variantId } },
        relations: ['branch', 'variant'],
      });

      const beforeTo = to?.quantity ?? 0;
      if (!to) {
        const branch = await this.findBranchOrThrow(toBranchId);
        const variant = await this.findVariantOrThrow(variantId);
        to = manager.create(Inventory, { branch, variant, quantity: 0 });
      }

      to.quantity += qty;
      await manager.save(to);

      // سجل حركتين
      await this.recordMovement({
        branchId: fromBranchId,
        variantId,
        userId: user.id,
        type: 'transfer',
        quantityBefore: beforeFrom,
        quantityAfter: from.quantity,
        quantityChange: -qty,
        notes: 'Stock transferred out',
      });

      await this.recordMovement({
        branchId: toBranchId,
        variantId,
        userId: user.id,
        type: 'transfer',
        quantityBefore: beforeTo,
        quantityAfter: to.quantity,
        quantityChange: qty,
        notes: 'Stock transferred in',
      });

      await this.invalidateCaches(fromBranchId);
      await this.invalidateCaches(toBranchId);

      return {
        from: {
          id: from.id,
          branchId: from.branch.id,
          branchName: from.branch.name,
          variantId: from.variant.id,
          variantSku: from.variant.sku,
          quantityBefore: beforeFrom,
          quantityAfter: from.quantity,
        },
        to: {
          id: to.id,
          branchId: to.branch.id,
          branchName: to.branch.name,
          variantId: to.variant.id,
          variantSku: to.variant.sku,
          quantityBefore: beforeTo,
          quantityAfter: to.quantity,
        },
        transferredQuantity: qty,
      };
    });
  }

  async findAll(
    user: IUserPayload,
    branchId?: string,
  ): Promise<InventoryListItemResponse[]> {
    if (user.role !== Role.admin) branchId = user.branchId;
    const key = this.cacheKey(branchId);
    const cached = await this.cacheManager.get<Inventory[]>(key);

    let data: Inventory[];
    if (cached) {
      data = cached;
    } else {
      const where = branchId ? { branch: { id: branchId } } : {};
      data = await this.invRepo.find({
        where,
        relations: ['branch', 'variant', 'variant.product'],
      });
      await this.cacheManager.set(key, data, 300);
    }

    return data.map((inv) => ({
      id: inv.id,
      branch: {
        id: inv.branch.id,
        name: inv.branch.name,
        address: inv.branch.address,
      },
      variant: {
        id: inv.variant.id,
        sku: inv.variant.sku,
        barcode: inv.variant.barcode ?? '',
        price: inv.variant.price,
        costPrice: inv.variant.costPrice,
        product: {
          id: inv.variant.product.id,
          name: inv.variant.product.name,
          brand: inv.variant.product.brand,
        },
      },
      quantity: inv.quantity,
      minThreshold: inv.minThreshold,
      lowStockAlertSent: inv.lowStockAlertSent,
      lastAlertSentAt: inv.lastAlertSentAt,
      isLowStock: inv.quantity <= inv.minThreshold,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
    }));
  }

  async findOne(
    id: string,
    user: IUserPayload,
  ): Promise<InventoryDetailResponse> {
    const inv = await this.invRepo.findOne({
      where: { id },
      relations: ['branch', 'variant', 'variant.product'],
    });
    if (!inv) throw new NotFoundException('Inventory not found');
    this.checkBranchAccess(user, inv.branch.id);

    return {
      id: inv.id,
      branch: {
        id: inv.branch.id,
        name: inv.branch.name,
        address: inv.branch.address,
        phone: inv.branch.phone,
        isActive: inv.branch.isActive,
      },
      variant: {
        id: inv.variant.id,
        sku: inv.variant.sku,
        barcode: inv.variant.barcode ?? '',
        price: inv.variant.price,
        costPrice: inv.variant.costPrice,
        isActive: inv.variant.isActive,
        product: {
          id: inv.variant.product.id,
          name: inv.variant.product.name,
          description: inv.variant.product.description,
          brand: inv.variant.product.brand,
          basePrice: inv.variant.product.basePrice,
        },
      },
      quantity: inv.quantity,
      minThreshold: inv.minThreshold,
      lowStockAlertSent: inv.lowStockAlertSent,
      lastAlertSentAt: inv.lastAlertSentAt,
      isLowStock: inv.quantity <= inv.minThreshold,
      stockStatus: this.getStockStatus(inv.quantity, inv.minThreshold),
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
    };
  }

  async update(
    id: string,
    dto: UpdateInventoryDto,
    user: IUserPayload,
  ): Promise<UpdateInventoryResponse> {
    const record = await this.invRepo.findOne({
      where: { id },
      relations: ['branch', 'variant', 'variant.product'],
    });
    if (!record) throw new NotFoundException('Inventory not found');
    this.checkBranchAccess(user, record.branch.id);

    if (dto.quantity && dto.quantity < record.minThreshold) {
      throw new BadRequestException(
        'Quantity cannot be less than minimum threshold',
      );
    }

    Object.assign(record, dto);
    const saved = await this.invRepo.save(record);
    await this.invalidateCaches(record.branch?.id);

    return {
      id: saved.id,
      branchId: record.branch.id,
      branchName: record.branch.name,
      variantId: record.variant.id,
      variantSku: record.variant.sku,
      quantity: saved.quantity,
      minThreshold: saved.minThreshold,
      lowStockAlertSent: saved.lowStockAlertSent,
      updatedAt: saved.updatedAt,
    };
  }

  async getLowStock(
    user: IUserPayload,
    threshold = 5,
  ): Promise<LowStockItemResponse[]> {
    const query = this.invRepo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.variant', 'v')
      .leftJoinAndSelect('v.product', 'p')
      .leftJoinAndSelect('inv.branch', 'b')
      .where('inv.quantity <= :t', { t: threshold });

    if (user.role !== Role.admin)
      query.andWhere('b.id = :branchId', { branchId: user.branchId });

    const items = await query.getMany();

    return items.map((inv) => ({
      id: inv.id,
      branch: {
        id: inv.branch.id,
        name: inv.branch.name,
      },
      variant: {
        id: inv.variant.id,
        sku: inv.variant.sku,
        barcode: inv.variant.barcode ?? '',
        product: {
          id: inv.variant.product.id,
          name: inv.variant.product.name,
          brand: inv.variant.product.brand,
        },
      },
      quantity: inv.quantity,
      minThreshold: inv.minThreshold,
      stockDeficit: inv.minThreshold - inv.quantity,
      lastAlertSentAt: inv.lastAlertSentAt,
    }));
  }

  async findOneByVariantAndBranch(
    variantId: string,
    branchId: string,
  ): Promise<InventoryDetailResponse | null> {
    const inv = await this.invRepo.findOne({
      where: { variant: { id: variantId }, branch: { id: branchId } },
      relations: ['branch', 'variant', 'variant.product'],
    });

    if (!inv) return null;

    return {
      id: inv.id,
      branch: {
        id: inv.branch.id,
        name: inv.branch.name,
        address: inv.branch.address,
        phone: inv.branch.phone,
        isActive: inv.branch.isActive,
      },
      variant: {
        id: inv.variant.id,
        sku: inv.variant.sku,
        barcode: inv.variant.barcode ?? '',
        price: inv.variant.price,
        costPrice: inv.variant.costPrice,
        isActive: inv.variant.isActive,
        product: {
          id: inv.variant.product.id,
          name: inv.variant.product.name,
          description: inv.variant.product.description,
          brand: inv.variant.product.brand,
          basePrice: inv.variant.product.basePrice,
        },
      },
      quantity: inv.quantity,
      minThreshold: inv.minThreshold,
      lowStockAlertSent: inv.lowStockAlertSent,
      lastAlertSentAt: inv.lastAlertSentAt,
      isLowStock: inv.quantity <= inv.minThreshold,
      stockStatus: this.getStockStatus(inv.quantity, inv.minThreshold),
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
    };
  }

  private async invalidateCaches(branchId?: string) {
    if (branchId) await this.cacheManager.del(this.cacheKey(branchId));
    await this.cacheManager.del(this.cacheKey());
  }
}
