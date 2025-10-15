import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class BranchesService {
  constructor(@InjectRepository(Branch) private branchrepo: Repository<Branch>,
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    @InjectRepository(User) private userRepository: Repository<User>,

  ) { }
  async create(createBranchDto: CreateBranchDto , userId : string): Promise<IBranchResponse> {
    if (await this.branchrepo.findOne({ where: { name: createBranchDto.name } })) {
      throw new BadRequestException('Branch name already exists');
    }

    const branch = await this.branchrepo.create(createBranchDto);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    branch.users.push(user!);
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

  async getBranchStats(branchId: string , managerId : string) : Promise<IBranchStatsResponse> {
    const branch = await this.branchrepo.findOne({ where: { id: branchId } });
    if (!branch) throw new NotFoundException('Branch not found');

    const inventories = await this.inventoryRepository.find({
      where: { branch: { id: branchId } },
      relations: ['product'],
    });

    const productStats: {
      productId: string;
      name: string;
      quantity: number;
      minThreshold: number;
      thresholdPassed: boolean;
      sellingPrice: number;
      costPrice: number;
      profit: number;
      profitMargin: string;

    }[] = [];
    let totalProfit = 0;
    let totalLoss = 0;

    for (const inv of inventories) {
      const product = inv.product;

      const sellingPrice = product.basePrice;
      const costPrice = await this.getAverageCostPrice(product.id);

      const profit = (sellingPrice - costPrice) * inv.quantity;
      const profitMargin =
        costPrice !== 0 ? ((sellingPrice - costPrice) / costPrice) * 100 : 0;

      if (profit >= 0) totalProfit += profit;
      else totalLoss += profit;

      productStats.push({
        productId: product.id,
        name: product.name,
        quantity: inv.quantity,
        minThreshold: inv.minThreshold,
        thresholdPassed: inv.quantity < inv.minThreshold,
        sellingPrice,
        costPrice,
        profit,
        profitMargin: profitMargin.toFixed(2) + '%',
      });
    }


    return {
      branch: {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
      },
      summary: {
        totalProducts: inventories.length,
        totalProfit,
        totalLoss,
        lowStockCount: productStats.filter(p => p.thresholdPassed).length,
      },
      products: productStats,
    };
  }

  async findOne(id: string): Promise<IBranchResponse> {
    const branch = await this.branchrepo.findOne({ where: { id } });
    if (!branch) {
      throw new BadRequestException('Branch not found');
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
    await this.branchrepo.save(branch);
    return {
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
    };
  }

  async remove(id: string): Promise<string> {
    const branch = await this.branchrepo.findOne({ where: { id } });
    if (!branch) {
      throw new BadRequestException('Branch not found');
    }
    await this.branchrepo.remove(branch);
    return 'Branch removed successfully';
  }

  private async getAverageCostPrice(productId: string): Promise<number> {
    const variants = await this.variantRepository.find({
      where: { product: { id: productId } },
    });

    if (!variants.length) return 0;

    const avgCost =
      variants.reduce((sum, v) => sum + Number(v.costPrice), 0) / variants.length;
    return +avgCost.toFixed(2);
  }
}
