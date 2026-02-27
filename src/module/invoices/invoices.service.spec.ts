import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesService } from './invoices.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice_items.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Branch } from '../branches/entities/branch.entity';
import { User } from '../users/entities/user.entity';
import { StockMovement } from '../stock/entities/stock.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InventoryService } from '../inventory/inventory.service';
import { DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

const mockRepo = () => ({
  find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(),
  update: jest.fn(), remove: jest.fn(), createQueryBuilder: jest.fn(),
});

describe('InvoicesService', () => {
  let service: InvoicesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        InventoryService,
        { provide: DataSource, useValue: { createQueryRunner: jest.fn() } },
        { provide: getRepositoryToken(Invoice), useFactory: mockRepo },
        { provide: getRepositoryToken(InvoiceItem), useFactory: mockRepo },
        { provide: getRepositoryToken(Branch), useFactory: mockRepo },
        { provide: getRepositoryToken(User), useFactory: mockRepo },
        { provide: getRepositoryToken(ProductVariant), useFactory: mockRepo },
        { provide: getRepositoryToken(Inventory), useFactory: mockRepo },
        { provide: getRepositoryToken(StockMovement), useFactory: mockRepo },
        { provide: CACHE_MANAGER, useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: 'BullQueue_INVOICES_QUEUE', useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
