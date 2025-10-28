import { BadRequestException, Injectable } from '@nestjs/common';
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
    private supplierRepository: Repository<Supplier>,
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
    const verifyname = await this.supplierRepository.findOneBy({ name: createSupplierDto.name });
    if (verifyname) {
      throw new BadRequestException('Supplier already exists');
    }
    const supplier = await this.supplierRepository.create(createSupplierDto);
    return this.supplierRepository.save(supplier);
  }

  async findAll() {
    return this.supplierRepository.find({ relations: ['products', 'purchases'] });
  }

  async findOne(id: string): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({
      where: { id },
      relations: ['products', 'purchases'],
    });
    if (!supplier) {
      throw new BadRequestException('Supplier not found');
    }
    return supplier;

  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.supplierRepository.preload({
      id: id,
      ...updateSupplierDto,
    });
    if (!supplier) {
      throw new BadRequestException('Supplier not found');
    }
    return this.supplierRepository.save(supplier);
  }

  async remove(id: string): Promise<{ message: string }> {
    const supplier = await this.findOne(id);
    if (!supplier) {
      throw new BadRequestException('Supplier not found');
    }
    await this.supplierRepository.remove(supplier);
    return { message: 'Supplier removed successfully' };
  }

  async getRefillRecommendations(): Promise<ISuppliersRecommendations[] | { message: string }> {
    // 🧮 Step 1: Get all inventory items below minThreshold
    const lowStockItems = await this.inventoryRepo
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')  // ✅ Add this line
      .leftJoinAndSelect('inventory.branch', 'branch')
      .where('inventory.quantity < inventory.minThreshold')
      .getMany();

    if (!lowStockItems.length) {
      return { message: '✅ All stocks are above threshold.' };
    }

    // 🧠 Step 2: Generate recommendations
    const recommendations: ISuppliersRecommendations[] = [];

    for (const item of lowStockItems) {
      const { variant, branch, quantity, minThreshold } = item;
      if (!variant || !branch) {
        console.warn('Skipping item missing branch or variant', item.id);
        continue;
      }

      // 🧾 Get recent purchases for this variant in the same branch
      const recentPurchases = await this.purchaseRepo
        .createQueryBuilder('purchase')
        .leftJoinAndSelect('purchase.supplier', 'supplier')
        .leftJoinAndSelect('purchase.items', 'items')
        .leftJoinAndSelect('items.variant', 'itemVariant')  // ✅ Add this line
        .leftJoin('purchase.branch', 'branch')
        .where('purchase.branchId = :branchId', { branchId: branch.id })
        .andWhere('purchase.status = :status', { status: 'completed' })
        .andWhere('items.variantId = :variantId', { variantId: variant.id })
        .orderBy('purchase.createdAt', 'DESC')
        .limit(5)
        .getMany();

      if (!recentPurchases.length) continue;

      // 🧮 Calculate average cost per supplier for this variant
      const supplierStats = new Map<string, { totalCost: number; count: number; supplier: Supplier }>();

      for (const p of recentPurchases) {
        if (!p.supplier) continue;

        // حساب التكلفة الفعلية للـ variant من items
        const variantItems = p.items.filter(it => it.variant.id === variant.id);
        const variantTotal = variantItems.reduce((sum, it) => sum + it.unitCost * it.quantity, 0);

        const key = p.supplier.name;
        if (!supplierStats.has(key)) {
          supplierStats.set(key, { totalCost: 0, count: 0, supplier: p.supplier });
        }

        const data = supplierStats.get(key)!;
        data.totalCost += variantTotal;
        data.count += variantItems.length;
      }

      if (!supplierStats.size) continue;

      // 🧠 Pick best supplier based on lowest avg cost
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
