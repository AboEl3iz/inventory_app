import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StockMovement } from './entities/stock.entity';
import { Role } from 'src/common/decorator/roles.decorator';
import { IUserPayload } from 'src/shared/interfaces/user-payload.interface';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
  ) { }

  /**
   * Get all stock movements with optional filters
   */
  async findAll(
    user: IUserPayload,
    page = 1,
    limit = 20,
    type?: string,
    branchId?: string,
  ) {
    const qb = this.movementRepo
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('movement.branch', 'branch')
      .leftJoinAndSelect('movement.user', 'user')
      .orderBy('movement.createdAt', 'DESC');

    // Non-admin users can only see their own branch
    if (user.role !== Role.admin) {
      qb.where('branch.id = :branchId', { branchId: user.branchId });
    } else if (branchId) {
      qb.where('branch.id = :branchId', { branchId });
    }

    if (type) {
      qb.andWhere('movement.type = :type', { type });
    }

    qb.skip((page - 1) * limit).take(limit);
    const [movements, total] = await qb.getManyAndCount();

    return {
      data: movements.map((mov) => ({
        id: mov.id,
        type: mov.type,
        productName: mov.variant?.product?.name,
        variantSku: mov.variant?.sku,
        branchName: mov.branch?.name,
        userName: mov.user?.name,
        quantityChange: mov.quantityChange,
        quantityBefore: mov.quantityBefore,
        quantityAfter: mov.quantityAfter,
        referenceType: mov.referenceType,
        referenceId: mov.referenceId,
        notes: mov.notes,
        createdAt: mov.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single stock movement by ID
   */
  async findOne(id: string) {
    const movement = await this.movementRepo.findOne({
      where: { id },
      relations: ['variant', 'variant.product', 'branch', 'user'],
    });

    if (!movement) throw new NotFoundException('Stock movement not found');

    return {
      id: movement.id,
      type: movement.type,
      productName: movement.variant?.product?.name,
      variantSku: movement.variant?.sku,
      branchName: movement.branch?.name,
      userName: movement.user?.name,
      quantityChange: movement.quantityChange,
      quantityBefore: movement.quantityBefore,
      quantityAfter: movement.quantityAfter,
      referenceType: movement.referenceType,
      referenceId: movement.referenceId,
      notes: movement.notes,
      createdAt: movement.createdAt,
    };
  }

  /**
   * Get movement summary (aggregated stats)
   */
  async getSummary(user: IUserPayload, startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const qb = this.movementRepo
      .createQueryBuilder('movement')
      .leftJoin('movement.branch', 'branch')
      .where('movement.createdAt BETWEEN :start AND :end', { start, end });

    if (user.role !== Role.admin) {
      qb.andWhere('branch.id = :branchId', { branchId: user.branchId });
    }

    const summary = await qb
      .select('movement.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(ABS(movement.quantityChange))', 'totalUnits')
      .groupBy('movement.type')
      .getRawMany();

    return {
      period: { start, end },
      breakdown: summary.map((s) => ({
        type: s.type,
        count: Number(s.count),
        totalUnits: Number(s.totalUnits),
      })),
    };
  }
}
