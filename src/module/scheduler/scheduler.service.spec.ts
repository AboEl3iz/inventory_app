import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from './scheduler.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Inventory } from '../inventory/entities/inventory.entity';
import { StockMovement } from '../stock/entities/stock.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Branch } from '../branches/entities/branch.entity';
import { User } from '../users/entities/user.entity';
import { NotificationService } from './notification.service';
import { ReportService } from '../reports/reports.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InvoiceItem } from '../invoices/entities/invoice_items.entity';

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
};

describe('SchedulerService', () => {
  let service: SchedulerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: getRepositoryToken(Inventory), useFactory: mockRepo },
        { provide: getRepositoryToken(StockMovement), useFactory: mockRepo },
        { provide: getRepositoryToken(Invoice), useFactory: mockRepo },
        { provide: getRepositoryToken(Purchase), useFactory: mockRepo },
        { provide: getRepositoryToken(ProductVariant), useFactory: mockRepo },
        { provide: getRepositoryToken(Branch), useFactory: mockRepo },
        { provide: getRepositoryToken(User), useFactory: mockRepo },
        { provide: getRepositoryToken(InvoiceItem), useFactory: mockRepo },
        {
          provide: NotificationService,
          useValue: {
            sendLowStockAlert: jest.fn(),
            handleLowStockAlert: jest.fn(),
          },
        },
        {
          provide: ReportService,
          useValue: {
            generateWeeklyReport: jest.fn(),
            generateProfitLossReport: jest.fn(),
            generateTaxSummary: jest.fn(),
            generateShrinkageReport: jest.fn(),
          },
        },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        {
          provide: SchedulerRegistry,
          useValue: {
            getCronJobs: jest.fn().mockReturnValue(new Map()),
            addCronJob: jest.fn(),
            deleteCronJob: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
