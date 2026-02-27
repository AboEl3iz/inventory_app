import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Branch } from './entities/branch.entity';
import { Repository } from 'typeorm';
import { IBranchResponse, IBranchStatsResponse, IBranchWithRelationsResponse } from 'src/shared/interfaces/branch-response';
import { Inventory } from '../inventory/entities/inventory.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Role } from 'src/common/decorator/roles.decorator';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch) private readonly branchrepo: Repository<Branch>,
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Invoice) private readonly invoiceRepository: Repository<Invoice>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
  ) { }
  async create(createBranchDto: CreateBranchDto, userId: string): Promise<IBranchResponse> {

    if (await this.branchrepo.findOne({ where: { name: createBranchDto.name } })) {
      throw new BadRequestException('Branch name already exists');
    }

    const branch = await this.branchrepo.create(createBranchDto);

    await this.branchrepo.save(branch);
    return {
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
    };
  }

  async findAll(): Promise<IBranchResponse[]> {
    const branches = await this.branchrepo.find();
    return branches.map(branch => ({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
    }));
  }

  async getBranchStats(branchId: string, managerpayload: any) {
    // Validate branch exists and manager has access
    const branch = await this.branchrepo.findOne({
      where: { id: branchId },
      relations: ['users']
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Verify manager has access to this branch
    const manager = await this.userRepository.findOne({
      where: { id: managerpayload.id },
      relations: ['branch']
    });
    this.logger.debug(`Manager branch ID: ${manager?.branch?.id}, Requested branch ID: ${branchId}, role: ${managerpayload.role}`);

    if ((managerpayload.role !== "admin") && (manager!.branch?.id !== branchId)) {
      throw new ForbiddenException('You do not have access to this branch');
    }

    // Get inventories with correct relations (variant -> product)
    const inventories = await this.inventoryRepository.find({
      where: { branch: { id: branchId } },
      relations: ['variant', 'variant.product'], // Fixed: variant instead of product
    });

    const productStats: {
      productId: string;
      variantId: string;
      productName: string;
      variantSku: string;
      quantity: number;
      minThreshold: number;
      thresholdPassed: boolean;
      sellingPrice: number;
      costPrice: number;
      potentialProfit: number;
      profitMargin: string;
    }[] = [];

    let totalPotentialProfit = 0;
    let totalPotentialLoss = 0;
    let totalInventoryValue = 0;
    let totalInventoryCost = 0;

    for (const inv of inventories) {
      const variant = inv.variant;
      const product = variant.product;

      // Use variant's actual selling price, not product base price
      const sellingPrice = Number(variant.price);
      const costPrice = Number(variant.costPrice);

      // Calculate potential profit (not actual profit - that comes from sales)
      const potentialProfit = (sellingPrice - costPrice) * inv.quantity;
      const profitMargin = costPrice !== 0
        ? ((sellingPrice - costPrice) / costPrice) * 100
        : 0;

      // Calculate inventory values
      totalInventoryValue += sellingPrice * inv.quantity;
      totalInventoryCost += costPrice * inv.quantity;

      if (potentialProfit >= 0) {
        totalPotentialProfit += potentialProfit;
      } else {
        totalPotentialLoss += Math.abs(potentialProfit);
      }

      productStats.push({
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        variantSku: variant.sku,
        quantity: inv.quantity,
        minThreshold: inv.minThreshold,
        thresholdPassed: inv.quantity < inv.minThreshold,
        sellingPrice,
        costPrice,
        potentialProfit,
        profitMargin: profitMargin.toFixed(2) + '%',
      });
    }

    // Get actual sales profit for the branch
    const actualProfit = await this.getActualBranchProfit(branchId);

    return {
      branch: {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
      },
      summary: {
        totalVariants: inventories.length,
        totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
        totalInventoryCost: Number(totalInventoryCost.toFixed(2)),
        potentialProfit: Number(totalPotentialProfit.toFixed(2)),
        potentialLoss: Number(totalPotentialLoss.toFixed(2)),
        actualProfit: Number(actualProfit.toFixed(2)),
        lowStockCount: productStats.filter(p => p.thresholdPassed).length,
      },
      products: productStats,
    };
  }

  async findOne(id: string): Promise<IBranchResponse> {
    const branch = await this.branchrepo.findOne({ where: { id } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    return {
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
    };
  }

  async update(id: string, updateBranchDto: UpdateBranchDto): Promise<IBranchResponse> {
    const branch = await this.branchrepo.findOne({ where: { id } });
    if (!branch) {
      throw new BadRequestException('Branch not found');
    }
    if (updateBranchDto.name && updateBranchDto.name !== branch.name) {
      if (await this.branchrepo.findOne({ where: { name: updateBranchDto.name } })) {
        throw new BadRequestException('Branch name already exists');
      }
      branch.name = updateBranchDto.name;
    }
    if (updateBranchDto.address) {
      branch.address = updateBranchDto.address;
    }
    if (updateBranchDto.phone) {
      branch.phone = updateBranchDto.phone;
    }
    if (updateBranchDto.isActive !== undefined) {
      branch.isActive = updateBranchDto.isActive;
    }
    await this.branchrepo.save(branch);
    return {
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
    };
  }

  async remove(id: string): Promise<{ message: string }> {
    const branch = await this.branchrepo.findOne({ where: { id } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    await this.branchrepo.softRemove(branch);
    return { message: 'Branch removed successfully' };
  }

  private async getActualBranchProfit(branchId: string): Promise<number> {
    const invoices = await this.invoiceRepository.find({
      where: {
        branch: { id: branchId },
        status: 'paid' // Only count paid invoices
      },
      relations: ['items', 'items.variant'],
    });

    let totalProfit = 0;

    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const sellingPrice = Number(item.unitPrice);
        const costPrice = Number(item.variant.costPrice);
        const profit = (sellingPrice - costPrice) * item.quantity;
        totalProfit += profit;
      }
    }

    return totalProfit;
  }

  async assignUserToBranch(branchId: string, userId: string, role: Role) {
    const branch = await this.branchrepo.findOne({
      where: { id: branchId },
      relations: ['users'],
    });
    if (!branch) throw new NotFoundException('Branch not found');

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role !== role)
      throw new BadRequestException(`User is not a ${role}`);

    user.branch = branch;
    await this.userRepository.save(user);

    return {
      message: `${role} assigned to branch successfully`,
      branchId: branch.id,
      userId: user.id,
      role: user.role,
    };
  }
}
