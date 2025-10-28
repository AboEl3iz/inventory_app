import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Purchase } from './entities/purchase.entity';
import { PURCHASE_COMPLETED } from 'src/shared/event.constants';
import { PurchaseItem } from './entities/purchase-item.entity';
import { User } from '../users/entities/user.entity';
import { Role } from 'src/common/decorator/roles.decorator';

@Injectable()
export class PurchasesService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Purchase) private purchaseRepo: Repository<Purchase>,
    @InjectRepository(Supplier) private supplierRepo: Repository<Supplier>,
    @InjectRepository(Branch) private branchRepo: Repository<Branch>,
    @InjectRepository(ProductVariant)
    private variantRepo: Repository<ProductVariant>,
    private eventEmitter: EventEmitter2,
  ) {}

  async createPurchase(dto: CreatePurchaseDto, user: any) {
    // Only allow purchases in user’s branch if not admin
    if (user.role !== Role.admin && dto.branchId !== user.branchId)
      throw new ForbiddenException('Cannot create purchase for another branch');

    return this.dataSource.transaction(async (manager) => {
      const [supplier, branch] = await Promise.all([
        manager.findOne(Supplier, { where: { id: dto.supplierId } }),
        manager.findOne(Branch, { where: { id: dto.branchId } }),
      ]);

      if (!supplier || !branch)
        throw new BadRequestException('Invalid supplier or branch');

      // Prevent duplicate variant IDs
      const variantIds = new Set(dto.items.map((i) => i.variantId));
      if (variantIds.size !== dto.items.length)
        throw new BadRequestException('Duplicate variant in items');

      // Calculate totals
      const subtotal = dto.items.reduce(
        (sum, i) => sum + i.quantity * i.unitCost,
        0,
      );
      const discount = 0;
      const tax = 0;
      const totalAmount = subtotal - discount + tax;

      // Generate unique purchase number
      const count = await manager.count(Purchase);
      const purchaseNumber = `PO-${String(count + 1).padStart(5, '0')}`;

      const purchase = manager.create(Purchase, {
        purchaseNumber,
        supplier,
        branch,
        user,
        subtotal,
        discount,
        tax,
        totalAmount,
        status: 'pending',
      });
      const savedPurchase = await manager.save(purchase);

      const itemsEntities: PurchaseItem[] = [];
      for (const it of dto.items) {
        const variant = await manager.findOne(ProductVariant, {
          where: { id: it.variantId },
        });
        if (!variant)
          throw new BadRequestException(`Variant not found: ${it.variantId}`);

        const item = manager.create(PurchaseItem, {
          purchase: savedPurchase,
          variant,
          quantity: it.quantity,
          unitCost: it.unitCost,
          subtotal: it.quantity * it.unitCost,
        });
        itemsEntities.push(await manager.save(item));
      }

      return { purchase: savedPurchase, items: itemsEntities };
    });
  }

  async completePurchase(id: string, user: any) {
    const purchase = await this.purchaseRepo.findOne({
      where: { id },
      relations: ['items', 'items.variant', 'branch'],
    });
    if (!purchase) throw new NotFoundException('Purchase not found');

    if (
      user.role !== Role.admin &&
      purchase.branch.id !== user.branchId
    ) {
      throw new ForbiddenException('Access denied to this purchase');
    }

    if (purchase.status === 'completed')
      throw new BadRequestException('Purchase already completed');
    if (purchase.status === 'cancelled')
      throw new BadRequestException('Cannot complete a cancelled purchase');

    purchase.status = 'completed';
    purchase.receivedAt = new Date();

    const saved = await this.purchaseRepo.save(purchase);

    this.eventEmitter.emit(PURCHASE_COMPLETED, {
      purchaseId: saved.id,
      branchId: purchase.branch.id,
      items: purchase.items.map((i) => ({
        variantId: i.variant.id,
        qty: i.quantity,
      })),
    });

    return saved;
  }

  async findAll(user: any) {
    const query = this.purchaseRepo
      .createQueryBuilder('purchase')
      .leftJoinAndSelect('purchase.supplier', 'supplier')
      .leftJoinAndSelect('purchase.branch', 'branch')
      .leftJoinAndSelect('purchase.user', 'user')
      .leftJoinAndSelect('purchase.items', 'items')
      .leftJoinAndSelect('items.variant', 'variant')
      .orderBy('purchase.createdAt', 'DESC');

    if (user.role !== Role.admin) {
      query.andWhere('branch.id = :branchId', { branchId: user.branchId });
    }

    return query.getMany();
  }

  async findOne(id: string, user: any) {
    const purchase = await this.purchaseRepo.findOne({
      where: { id },
      relations: ['supplier', 'branch', 'user', 'items', 'items.variant'],
    });
    if (!purchase) throw new NotFoundException('Purchase not found');

    if (
      user.role !== Role.admin &&
      purchase.branch.id !== user.branchId
    ) {
      throw new ForbiddenException('Access denied to this purchase');
    }

    return purchase;
  }

  async remove(id: string, user: any) {
    const purchase = await this.purchaseRepo.findOne({
      where: { id },
      relations: ['branch'],
    });
    if (!purchase) throw new NotFoundException('Purchase not found');

    if (
      user.role !== Role.admin &&
      purchase.branch.id !== user.branchId
    ) {
      throw new ForbiddenException('Access denied to this purchase');
    }

    await this.purchaseRepo.softRemove(purchase);
    return { message: 'Purchase soft-deleted successfully' };
  }
}