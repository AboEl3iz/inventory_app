import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { guardMockProviders } from '../../test/test-utils';

describe('ProductsController', () => {
  let controller: ProductsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        ...guardMockProviders,
        {
          provide: ProductsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            restore: jest.fn(),
            flatList: jest.fn(),
            stats: jest.fn(),
            search: jest.fn(),
            findByCategory: jest.fn(),
            addVariants: jest.fn(),
            getVariants: jest.fn(),
            updateVariant: jest.fn(),
            deleteVariant: jest.fn(),
            addAttribute: jest.fn(),
            addAttributeValue: jest.fn(),
            getAttributes: jest.fn(),
            getAttributesByCategory: jest.fn(),
            linkVariantValues: jest.fn(),
            getVariantValues: jest.fn(),
            uploadProductImages: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
