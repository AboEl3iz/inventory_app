import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from './reports.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { StockMovement } from '../stock/entities/stock.entity';
import { InvoiceItem } from '../invoices/entities/invoice_items.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('ReportService', () => {
  let service: ReportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: getRepositoryToken(Invoice), useFactory: mockRepo },
        { provide: getRepositoryToken(Purchase), useFactory: mockRepo },
        { provide: getRepositoryToken(StockMovement), useFactory: mockRepo },
        { provide: getRepositoryToken(InvoiceItem), useFactory: mockRepo },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
