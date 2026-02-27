import { Test, TestingModule } from '@nestjs/testing';
import { PurchasesService } from './purchases.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Purchase } from './entities/purchase.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Branch } from '../branches/entities/branch.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';

const mockRepo = () => ({
  find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(),
  update: jest.fn(), remove: jest.fn(), createQueryBuilder: jest.fn(),
});

describe('PurchasesService', () => {
  let service: PurchasesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasesService,
        { provide: DataSource, useValue: { createQueryRunner: jest.fn() } },
        { provide: getRepositoryToken(Purchase), useFactory: mockRepo },
        { provide: getRepositoryToken(Supplier), useFactory: mockRepo },
        { provide: getRepositoryToken(Branch), useFactory: mockRepo },
        { provide: getRepositoryToken(ProductVariant), useFactory: mockRepo },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: 'BullQueue_PURCHASES_QUEUE', useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = module.get<PurchasesService>(PurchasesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
