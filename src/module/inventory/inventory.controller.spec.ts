import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { guardMockProviders } from '../../test/test-utils';

describe('InventoryController', () => {
  let controller: InventoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        ...guardMockProviders,
        {
          provide: InventoryService,
          useValue: {
            create: jest.fn(), findAll: jest.fn(), findOne: jest.fn(),
            update: jest.fn(), adjustStock: jest.fn(), transferStock: jest.fn(),
            getLowStock: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
