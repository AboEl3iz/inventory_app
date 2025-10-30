import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, In, Repository } from 'typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Invoice } from './entities/invoice.entity';
import { INVOICE_CANCELED, INVOICE_CREATED } from 'src/shared/event.constants';
import { InvoiceItem } from './entities/invoice_items.entity';
import { Role } from 'src/common/decorator/roles.decorator';
import { InventoryService } from '../inventory/inventory.service';
import { InjectQueue } from '@nestjs/bullmq';
import { BranchStatsResponse, CancelInvoiceResponse, CreateInvoiceResponse, GetAllInvoicesResponse, InvoiceDetailResponse } from 'src/shared/interfaces/invoices-response';
import { User } from '../users/entities/user.entity';

@Injectable()
export class InvoicesService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Invoice) private invRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem) private itemRepo: Repository<InvoiceItem>,
    @InjectRepository(Branch) private branchRepo: Repository<Branch>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(ProductVariant) private variantRepo: Repository<ProductVariant>,
    private readonly eventEmitter: EventEmitter2,
    private readonly inventoryService: InventoryService,
    @InjectQueue('INVOICES_QUEUE') private invoicesQueue,
  ) { }

  /**
   * 🟢 Create a new invoice
   */
  async createInvoice(dto: CreateInvoiceDto): Promise<CreateInvoiceResponse> {
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
        const inventory = await this.inventoryService.findOneByVarientAndBranch(item.variantId, branchId);
        if (!inventory || inventory.quantity < item.quantity) {
          throw new BadRequestException(`Insufficient stock for variant ${item.variantId}`);
        }
      }

      // Calculate totals
      const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
      const discount = dto.discount || 0;
      const tax = dto.tax || 0;
      const totalAmount = subtotal - discount + tax;

      // Generate invoice number
      const count = await manager.count(Invoice);
      const invoiceNumber = `INV-${String(count + 1).padStart(6, '0')}-${Date.now()}`;

      const invoice = manager.create(Invoice, {
        invoiceNumber,
        branch,
        user: { id: userId } as User,
        subtotal,
        discount,
        tax,
        totalAmount,
        status: (dto.status || 'paid') as any,
        paymentMethod: (dto.paymentMethod || null) as any,
        paidAt: dto.status === 'paid' ? new Date() : null,
        notes: dto.notes || '',
      } as DeepPartial<Invoice>);


      const savedInvoice = await manager.save(invoice);

      const itemEntities = items.map((it) => {
        const variant = variantMap.get(it.variantId);
        if (!variant) throw new BadRequestException(`Variant ${it.variantId} not found`);

        return manager.create(InvoiceItem, {
          invoice: savedInvoice,
          variant,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount || 0,
          subtotal: (it.quantity * it.unitPrice) - (it.discount || 0),
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
        this.invoicesQueue.add(INVOICE_CREATED, {
          invoiceId: savedInvoice.id,
          branchId,
          items: savedItems.map((i) => ({
            variantId: i.variant.id,
            qty: i.quantity,
          })),
        });
      });

      // Get user info for response
      const user = await this.userRepo.findOneBy({ id: userId });

      return {
        invoice: {
          id: savedInvoice.id,
          invoiceNumber: savedInvoice.invoiceNumber,
          branchId: branch.id,
          branchName: branch.name,
          userId: userId,
          userName: user?.name || 'Unknown',
          subtotal: savedInvoice.subtotal,
          discount: savedInvoice.discount,
          tax: savedInvoice.tax,
          totalAmount: savedInvoice.totalAmount,
          status: savedInvoice.status,
          paymentMethod: savedInvoice.paymentMethod,
          paidAt: savedInvoice.paidAt,
          notes: savedInvoice.notes,
          createdAt: savedInvoice.createdAt,
        },
        items: savedItems.map(item => ({
          id: item.id,
          variantId: item.variant.id,
          variantSku: item.variant.sku,
          productName: item.variant.product.name,
          productBrand: item.variant.product.brand,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          subtotal: item.subtotal,
        })),
      };
    });
  }

  /**
   * 🟢 Get all invoices
   */
  async getAll(
    user: any,
    branchId?: string,
    status?: string,
    limit = 20,
    page = 1
  ): Promise<GetAllInvoicesResponse> {
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

    const [invoices, count] = await qb.getManyAndCount();

    return {
      data: invoices.map(invoice => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        branchName: invoice.branch.name,
        userName: invoice.user.name,
        itemsCount: invoice.items.length,
        subtotal: invoice.subtotal,
        discount: invoice.discount,
        tax: invoice.tax,
        totalAmount: invoice.totalAmount,
        status: invoice.status,
        paymentMethod: invoice.paymentMethod,
        paidAt: invoice.paidAt,
        createdAt: invoice.createdAt,
      })),
      total: count,
      page,
      limit,
    };
  }

  /**
   * 🟢 Get single invoice
   */
  async getOne(id: string, user: any): Promise<InvoiceDetailResponse> {
    const invoice = await this.invRepo.findOne({
      where: { id },
      relations: ['items', 'items.variant', 'items.variant.product', 'user', 'branch'],
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (user.role !== Role.admin && invoice.branch.id !== user.branchId) {
      throw new ForbiddenException('Access denied.');
    }

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      user: {
        id: invoice.user.id,
        name: invoice.user.name,
        email: invoice.user.email,
        role: invoice.user.role,
      },
      branch: {
        id: invoice.branch.id,
        name: invoice.branch.name,
        address: invoice.branch.address,
        phone: invoice.branch.phone,
      },
      items: invoice.items.map(item => ({
        id: item.id,
        variant: {
          id: item.variant.id,
          sku: item.variant.sku,
          barcode: item.variant.barcode || '',
          price: item.variant.price,
        },
        productName: item.variant.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        subtotal: item.subtotal,
      })),
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      tax: invoice.tax,
      totalAmount: invoice.totalAmount,
      status: invoice.status,
      paymentMethod: invoice.paymentMethod,
      paidAt: invoice.paidAt,
      notes: invoice.notes,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  /**
   * 🔴 Cancel invoice (restore stock)
   */
  async cancelInvoice(id: string, user: any): Promise<CancelInvoiceResponse> {
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
    const saved = await this.invRepo.save(invoice);

    for (const item of invoice.items) {
      await this.inventoryService.adjustStock(invoice.branch.id, item.variant.id, item.quantity, {
        role: Role.admin,
        branchId: invoice.branch.id,
      });
    }

    await this.invoicesQueue.add(INVOICE_CANCELED, {
      invoiceId: id,
      branchId: invoice.branch.id,
      items: invoice.items.map((it) => ({
        variantId: it.variant.id,
        qty: it.quantity,
      })),
    });

    return {
      message: 'Invoice canceled and stock restored',
      invoice: {
        id: saved.id,
        invoiceNumber: saved.invoiceNumber,
        status: saved.status as 'cancelled',
        totalAmount: saved.totalAmount,
        itemsRestored: invoice.items.length,
        updatedAt: saved.updatedAt,
      },
    };
  }

  /**
   * 📊 Revenue stats by branch
   */
  async getBranchStats(branchId: string, user: any): Promise<BranchStatsResponse[]> {
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

    return stats.map(stat => ({
      date: stat.date,
      totalSales: parseFloat(stat.totalSales),
    }));
  }
}