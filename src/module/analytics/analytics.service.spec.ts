import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceItem } from '../invoices/entities/invoice_items.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { StockMovement } from '../stock/entities/stock.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { Branch } from '../branches/entities/branch.entity';
import { User } from '../users/entities/user.entity';

const mockRepo = () => ({
  find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(Invoice), useFactory: mockRepo },
        { provide: getRepositoryToken(InvoiceItem), useFactory: mockRepo },
        { provide: getRepositoryToken(Purchase), useFactory: mockRepo },
        { provide: getRepositoryToken(Inventory), useFactory: mockRepo },
        { provide: getRepositoryToken(StockMovement), useFactory: mockRepo },
        { provide: getRepositoryToken(ProductVariant), useFactory: mockRepo },
        { provide: getRepositoryToken(Product), useFactory: mockRepo },
        { provide: getRepositoryToken(Category), useFactory: mockRepo },
        { provide: getRepositoryToken(Branch), useFactory: mockRepo },
        { provide: getRepositoryToken(User), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
