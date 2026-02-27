import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Inventory } from './entities/inventory.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Branch } from '../branches/entities/branch.entity';
import { StockMovement } from '../stock/entities/stock.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(Inventory), useFactory: mockRepo },
        { provide: getRepositoryToken(ProductVariant), useFactory: mockRepo },
        { provide: getRepositoryToken(Branch), useFactory: mockRepo },
        { provide: getRepositoryToken(StockMovement), useFactory: mockRepo },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStockStatus()', () => {
    it('should return out_of_stock when quantity is 0', () => {
      expect(service.getStockStatus(0, 5)).toBe('out_of_stock');
    });

    it('should return low_stock when quantity is below threshold', () => {
      expect(service.getStockStatus(3, 5)).toBe('low_stock');
    });

    it('should return in_stock when quantity is above threshold', () => {
      expect(service.getStockStatus(10, 5)).toBe('in_stock');
    });
  });
});
