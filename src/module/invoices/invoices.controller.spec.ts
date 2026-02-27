import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { guardMockProviders } from '../../test/test-utils';

describe('InvoicesController', () => {
  let controller: InvoicesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [
        ...guardMockProviders,
        {
          provide: InvoicesService,
          useValue: {
            createInvoice: jest.fn(), getAll: jest.fn(), getOne: jest.fn(),
            cancelInvoice: jest.fn(), getBranchStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InvoicesController>(InvoicesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
