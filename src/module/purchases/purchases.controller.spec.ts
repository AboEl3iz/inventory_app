import { Test, TestingModule } from '@nestjs/testing';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { guardMockProviders } from '../../test/test-utils';

describe('PurchasesController', () => {
  let controller: PurchasesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchasesController],
      providers: [
        ...guardMockProviders,
        {
          provide: PurchasesService,
          useValue: {
            createPurchase: jest.fn(),
            completePurchase: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            cancelPurchase: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PurchasesController>(PurchasesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
