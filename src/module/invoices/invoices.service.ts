import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Invoice } from './entities/invoice.entity';
import { INVOICE_CANCELED, INVOICE_CREATED } from 'src/shared/event.constants';
import { InvoiceItem } from './entities/invoice_items.entity';
import { Role } from 'src/common/decorator/roles.decorator';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class InvoicesService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Invoice) private invRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem) private itemRepo: Repository<InvoiceItem>,
    @InjectRepository(Branch) private branchRepo: Repository<Branch>,
    @InjectRepository(ProductVariant) private variantRepo: Repository<ProductVariant>,
    private readonly eventEmitter: EventEmitter2,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * 🟢 Create a new invoice
   */
  async createInvoice(dto: CreateInvoiceDto) {
    const { branchId, userId, items } = dto;

    const branch = await this.branchRepo.findOneBy({ id: branchId });
    if (!branch) throw new BadRequestException('Invalid branch');

    return this.dataSource.transaction(async (manager) => {
      const variants = await manager.find(ProductVariant, {
        where: { id: In(items.map((i) => i.variantId)) },
        relations: ['product'],
      });

      const variantMap = new Map(variants.map((v) => [v.id, v]));

      // Check stock for all variants
      for (const item of items) {
        const inventory = await this.inventoryService.findOneByVarientAndBranch( item.variantId ,  branchId);
        if (!inventory || inventory.quantity < item.quantity) {
          throw new BadRequestException(`Insufficient stock for variant ${item.variantId}`);
        }
      }

      const invoice = manager.create(Invoice, {
        branch,
        user: { id: userId } as any,
        totalAmount: items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
        status: 'paid',
      });

      const savedInvoice = await manager.save(invoice);

      const itemEntities = items.map((it) => {
        const variant = variantMap.get(it.variantId);
        if (!variant) throw new BadRequestException(`Variant ${it.variantId} not found`);

        return manager.create(InvoiceItem, {
          invoice: savedInvoice,
          variant,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          subtotal: it.quantity * it.unitPrice,
        });
      });

      const savedItems = await manager.save(itemEntities);

      // Reduce stock
      for (const item of savedItems) {
        await this.inventoryService.adjustStock(branchId, item.variant.id, -item.quantity, {
          role: Role.admin, // internal system operation
          branchId,
        });
      }

      queueMicrotask(() => {
        this.eventEmitter.emit(INVOICE_CREATED, {
          invoiceId: savedInvoice.id,
          branchId,
          items: savedItems.map((i) => ({
            variantId: i.variant.id,
            qty: i.quantity,
          })),
        });
      });

      return { invoice: savedInvoice, items: savedItems };
    });
  }

  /**
   * 🟢 Get all invoices
   */
  async getAll(user: any, branchId?: string, status?: string, limit = 20, page = 1) {
    const qb = this.invRepo
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.user', 'user')
      .leftJoinAndSelect('invoice.branch', 'branch')
      .leftJoinAndSelect('invoice.items', 'items')
      .leftJoinAndSelect('items.variant', 'variant')
      .orderBy('invoice.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (user.role !== Role.admin) {
      qb.andWhere('branch.id = :branchId', { branchId: user.branchId });
    } else if (branchId) {
      qb.andWhere('branch.id = :branchId', { branchId });
    }

    if (status) qb.andWhere('invoice.status = :status', { status });

    const [data, count] = await qb.getManyAndCount();
    return { data, total: count, page, limit };
  }

  /**
   * 🟢 Get single invoice
   */
  async getOne(id: string, user: any) {
    const invoice = await this.invRepo.findOne({
      where: { id },
      relations: ['items', 'items.variant', 'user', 'branch'],
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (user.role !== Role.admin && invoice.branch.id !== user.branchId) {
      throw new ForbiddenException('Access denied.');
    }

    return invoice;
  }

  /**
   * 🔴 Cancel invoice (restore stock)
   */
  async cancelInvoice(id: string, user: any) {
    const invoice = await this.invRepo.findOne({
      where: { id },
      relations: ['items', 'items.variant', 'branch'],
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'cancelled') throw new BadRequestException('Already canceled');

    if (user.role !== Role.admin && invoice.branch.id !== user.branchId) {
      throw new ForbiddenException('Access denied.');
    }

    invoice.status = 'cancelled';
    await this.invRepo.save(invoice);

    for (const item of invoice.items) {
      await this.inventoryService.adjustStock(invoice.branch.id, item.variant.id, item.quantity, {
        role: Role.admin,
        branchId: invoice.branch.id,
      });
    }

    this.eventEmitter.emit(INVOICE_CANCELED, {
      invoiceId: id,
      branchId: invoice.branch.id,
      items: invoice.items.map((it) => ({
        variantId: it.variant.id,
        qty: it.quantity,
      })),
    });

    return { message: 'Invoice canceled and stock restored', invoice };
  }

  /**
   * 📊 Revenue stats by branch
   */
  async getBranchStats(branchId: string, user: any) {
    if (user.role !== Role.admin && user.branchId !== branchId) {
      throw new ForbiddenException('Access denied.');
    }

    const stats = await this.invRepo
      .createQueryBuilder('invoice')
      .select('DATE(invoice.createdAt)', 'date')
      .addSelect('SUM(invoice.totalAmount)', 'totalSales')
      .where('invoice.branchId = :branchId', { branchId })
      .andWhere('invoice.status = :status', { status: 'paid' })
      .groupBy('DATE(invoice.createdAt)')
      .orderBy('DATE(invoice.createdAt)', 'DESC')
      .getRawMany();

    return stats;
  }
}