import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Purchase } from './entities/purchase.entity';
import { PURCHASE_CANCELLED, PURCHASE_COMPLETED } from 'src/shared/event.constants';
import { PurchaseItem } from './entities/purchase-item.entity';
import { User } from '../users/entities/user.entity';
import { Role } from 'src/common/decorator/roles.decorator';
import { InjectQueue } from '@nestjs/bullmq';

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
    @InjectQueue('PURCHASES_QUEUE') private purchasesQueue,
  ) { }

  async createPurchase(dto: CreatePurchaseDto, user: any) {
    // التحقق من صلاحية إنشاء مشتريات في الفرع
    if (user.role !== Role.admin && dto.branchId !== user.branchId) {
      throw new ForbiddenException('Cannot create purchase for another branch');
    }

    return this.dataSource.transaction(async (manager) => {
      // جلب البيانات المطلوبة دفعة واحدة
      const variantIds = dto.items.map((i) => i.variantId);

      // التحقق من عدم تكرار المنتجات
      const uniqueVariantIds = new Set(variantIds);
      if (uniqueVariantIds.size !== dto.items.length) {
        throw new BadRequestException('Duplicate variants in purchase items');
      }

      const [supplier, branch, variants] = await Promise.all([
        manager.findOne(Supplier, { where: { id: dto.supplierId } }),
        manager.findOne(Branch, { where: { id: dto.branchId } }),
        manager.find(ProductVariant, { where: { id: In(variantIds) } }),
      ]);

      // التحقق من وجود المورد والفرع
      if (!supplier) {
        throw new BadRequestException('Supplier not found');
      }
      if (!branch) {
        throw new BadRequestException('Branch not found');
      }

      // التحقق من وجود جميع المنتجات
      if (variants.length !== variantIds.length) {
        const foundIds = variants.map((v) => v.id);
        const missingIds = variantIds.filter((id) => !foundIds.includes(id));
        throw new BadRequestException(
          `Variants not found: ${missingIds.join(', ')}`,
        );
      }

      // إنشاء map للمنتجات للوصول السريع
      const variantsMap = new Map(variants.map((v) => [v.id, v]));

      // حساب الإجماليات
      let subtotal = 0;
      const itemsData = dto.items.map((item) => {
        const itemSubtotal = item.quantity * item.unitCost;
        subtotal += itemSubtotal;

        return {
          variant: variantsMap.get(item.variantId),
          quantity: item.quantity,
          unitCost: item.unitCost,
          subtotal: itemSubtotal,
        };
      });

      const discount = dto.discount || 0;
      const tax = dto.tax || 0;
      const totalAmount = subtotal - discount + tax;

      // توليد رقم فاتورة فريد
      const count = await manager.count(Purchase);
      const purchaseNumber = `PO-${String(count + 1).padStart(6, '0')}+${Date.now()}`;

      // إنشاء فاتورة الشراء
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
        notes: dto.notes,
      });

      const savedPurchase = await manager.save(Purchase, purchase);

      // إنشاء عناصر الفاتورة دفعة واحدة
      const purchaseItems = itemsData.map((itemData) =>
        manager.create(PurchaseItem, {
          purchase: savedPurchase,
          variant: itemData.variant,
          quantity: itemData.quantity,
          unitCost: itemData.unitCost,
          subtotal: itemData.subtotal,
        }),
      );

      const savedItems = await manager.save(PurchaseItem, purchaseItems);
      for (const item of savedItems) {
        await manager.update(ProductVariant, { id: item.variant.id }, { costPrice: item.unitCost });
      }

      // إرجاع الفاتورة مع العناصر
      return {
        ...savedPurchase,
        items: savedItems,
      };
    });
  }

  async completePurchase(id: string, user: any) {
    const purchase = await this.purchaseRepo.findOne({
      where: { id },
      relations: ['items', 'items.variant', 'branch', 'supplier'],
    });

    if (!purchase) {
      throw new NotFoundException('Purchase not found');
    }

    // التحقق من الصلاحيات
    if (user.role !== Role.admin && purchase.branch.id !== user.branchId) {
      throw new ForbiddenException('Access denied to this purchase');
    }

    // التحقق من حالة الفاتورة
    if (purchase.status === 'completed') {
      throw new BadRequestException('Purchase already completed');
    }
    if (purchase.status === 'cancelled') {
      throw new BadRequestException('Cannot complete a cancelled purchase');
    }

    // تحديث الحالة
    purchase.status = 'completed';
    purchase.receivedAt = new Date();

    const saved = await this.purchaseRepo.save(purchase);

    // إرسال للـ queue لتحديث المخزون
    await this.purchasesQueue.add(PURCHASE_COMPLETED, {
      purchaseId: saved.id,
      branchId: purchase.branch.id,
      user: user,
      items: purchase.items.map((item) => ({
        variantId: item.variant.id,
        quantity: item.quantity,
        unitCost: item.unitCost, // مهم للتتبع التكاليف
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
      .leftJoinAndSelect('variant.product', 'product')
      .orderBy('purchase.createdAt', 'DESC');

    // تصفية حسب الفرع إذا لم يكن admin
    if (user.role !== Role.admin) {
      query.andWhere('branch.id = :branchId', { branchId: user.branchId });
    }

    return query.getMany();
  }

  async findOne(id: string, user: any) {
    const purchase = await this.purchaseRepo.findOne({
      where: { id },
      relations: [
        'supplier',
        'branch',
        'user',
        'items',
        'items.variant',
        'items.variant.product',
      ],
    });

    if (!purchase) {
      throw new NotFoundException('Purchase not found');
    }

    // التحقق من الصلاحيات
    if (user.role !== Role.admin && purchase.branch.id !== user.branchId) {
      throw new ForbiddenException('Access denied to this purchase');
    }

    return purchase;
  }

  async cancelPurchase(id: string, user: any) {
    const purchase = await this.purchaseRepo.findOne({
      where: { id },
      relations: ['branch'],
    });

    if (!purchase) {
      throw new NotFoundException('Purchase not found');
    }

    // التحقق من الصلاحيات
    if (user.role !== Role.admin && purchase.branch.id !== user.branchId) {
      throw new ForbiddenException('Access denied to this purchase');
    }

    // لا يمكن إلغاء فاتورة مكتملة
    if (purchase.status === 'completed') {
      throw new BadRequestException(
        'Cannot cancel a completed purchase. Use inventory adjustment instead.',
      );
    }

    if (purchase.status === 'cancelled') {
      throw new BadRequestException('Purchase already cancelled');
    }

    purchase.status = 'cancelled';
    await this.purchasesQueue.add(PURCHASE_CANCELLED, {
      purchaseId: id,
      branchId: purchase.branch.id,
      user: user,
      items: purchase.items.map((item) => ({
        variantId: item.variant.id,
        quantity: item.quantity,
        unitCost: item.unitCost, // مهم للتتبع التكاليف
      })),
    });
    return this.purchaseRepo.save(purchase);
  }

  async remove(id: string, user: any) {
    const purchase = await this.purchaseRepo.findOne({
      where: { id },
      relations: ['branch'],
    });

    if (!purchase) {
      throw new NotFoundException('Purchase not found');
    }

    // التحقق من الصلاحيات
    if (user.role !== Role.admin && purchase.branch.id !== user.branchId) {
      throw new ForbiddenException('Access denied to this purchase');
    }

    // منع حذف الفواتير المكتملة
    if (purchase.status === 'completed') {
      throw new BadRequestException(
        'Cannot delete completed purchases. Cancel it first or use inventory adjustment.',
      );
    }

    await this.purchaseRepo.softRemove(purchase);
    return { message: 'Purchase deleted successfully' };
  }
}