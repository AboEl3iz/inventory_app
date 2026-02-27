import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity';
import { Repository } from 'typeorm';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Product } from '../products/entities/product.entity';
import { ISuppliersRecommendations } from 'src/shared/interfaces/suppliers-recommendations';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(Purchase)
    private readonly purchaseRepo: Repository<Purchase>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
  ) { }

  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    const existing = await this.supplierRepository.findOneBy({ name: createSupplierDto.name });
    if (existing) {
      throw new BadRequestException('Supplier already exists');
    }
    const supplier = this.supplierRepository.create(createSupplierDto);
    return this.supplierRepository.save(supplier);
  }

  async findAll(page = 1, limit = 20) {
    const [suppliers, total] = await this.supplierRepository.findAndCount({
      select: ['id', 'name', 'contactPerson', 'phone', 'email', 'createdAt'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: suppliers, total, page, limit };
  }

  async findOne(id: string): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({
      where: { id },
      relations: ['products', 'purchases'],
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    return supplier;
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.supplierRepository.preload({
      id,
      ...updateSupplierDto,
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    return this.supplierRepository.save(supplier);
  }

  async remove(id: string): Promise<{ message: string }> {
    const supplier = await this.supplierRepository.findOne({ where: { id } });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    await this.supplierRepository.softRemove(supplier);
    return { message: 'Supplier removed successfully' };
  }

  /**
   * Generate refill recommendations based on low-stock items and best supplier pricing.
   * Optimized: batch-loads purchases instead of N+1 queries per item.
   */
  async getRefillRecommendations(): Promise<ISuppliersRecommendations[] | { message: string }> {
    // Step 1: Get all low-stock inventory items
    const lowStockItems = await this.inventoryRepo
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('inventory.branch', 'branch')
      .where('inventory.quantity < inventory.minThreshold')
      .getMany();

    if (!lowStockItems.length) {
      return { message: 'All stocks are above threshold.' };
    }

    // Step 2: Batch-load recent purchases for all relevant variants and branches
    const variantIds = [...new Set(lowStockItems.map((item) => item.variant.id))];
    const branchIds = [...new Set(lowStockItems.map((item) => item.branch.id))];

    const recentPurchases = await this.purchaseRepo
      .createQueryBuilder('purchase')
      .leftJoinAndSelect('purchase.supplier', 'supplier')
      .leftJoinAndSelect('purchase.items', 'items')
      .leftJoinAndSelect('items.variant', 'itemVariant')
      .leftJoin('purchase.branch', 'branch')
      .where('purchase.branchId IN (:...branchIds)', { branchIds })
      .andWhere('purchase.status = :status', { status: 'completed' })
      .andWhere('items.variantId IN (:...variantIds)', { variantIds })
      .orderBy('purchase.createdAt', 'DESC')
      .getMany();

    // Step 3: Build a lookup map: (branchId+variantId) → purchases
    const purchaseMap = new Map<string, typeof recentPurchases>();
    for (const p of recentPurchases) {
      for (const item of p.items) {
        const key = `${p.branch?.id || ''}:${item.variant.id}`;
        if (!purchaseMap.has(key)) purchaseMap.set(key, []);
        purchaseMap.get(key)!.push(p);
      }
    }

    // Step 4: Generate recommendations
    const recommendations: ISuppliersRecommendations[] = [];

    for (const item of lowStockItems) {
      const { variant, branch, quantity, minThreshold } = item;
      if (!variant || !branch) continue;

      const key = `${branch.id}:${variant.id}`;
      const purchases = purchaseMap.get(key) || [];
      if (!purchases.length) continue;

      // Calculate best supplier by lowest average cost
      const supplierStats = new Map<string, { totalCost: number; count: number; supplier: Supplier }>();

      for (const p of purchases.slice(0, 5)) { // Limit to last 5 per combo
        if (!p.supplier) continue;
        const variantItems = p.items.filter((it) => it.variant.id === variant.id);
        const variantTotal = variantItems.reduce((sum, it) => sum + it.unitCost * it.quantity, 0);

        const sKey = p.supplier.name;
        if (!supplierStats.has(sKey)) {
          supplierStats.set(sKey, { totalCost: 0, count: 0, supplier: p.supplier });
        }
        const data = supplierStats.get(sKey)!;
        data.totalCost += variantTotal;
        data.count += variantItems.length;
      }

      if (!supplierStats.size) continue;

      const bestSupplier = [...supplierStats.values()].reduce((prev, curr) =>
        curr.totalCost / curr.count < prev.totalCost / prev.count ? curr : prev,
      );

      recommendations.push({
        branch: branch.name,
        variant: variant.product.name,
        currentQuantity: quantity,
        threshold: minThreshold,
        recommendedSupplier: bestSupplier.supplier.name,
        avgPurchaseCost: +(bestSupplier.totalCost / bestSupplier.count).toFixed(2),
      });
    }

    return recommendations;
  }
}
