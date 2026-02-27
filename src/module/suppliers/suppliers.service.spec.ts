import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersService } from './suppliers.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { Product } from '../products/entities/product.entity';
import { Branch } from '../branches/entities/branch.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

const mockSupplier = {
  id: 'sup-1',
  name: 'Test Supplier',
  contactPerson: 'John Doe',
  phone: '1234567890',
  email: 'supplier@test.com',
  address: '123 Main St',
  isActive: true,
  products: [],
  purchases: [],
};

const mockSupplierRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  remove: jest.fn(),
  softRemove: jest.fn(),
  preload: jest.fn(),
};

const mockInventoryRepo = { createQueryBuilder: jest.fn() };
const mockPurchaseRepo = { createQueryBuilder: jest.fn() };
const mockProductRepo = {};
const mockBranchRepo = {};

describe('SuppliersService', () => {
  let service: SuppliersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        { provide: getRepositoryToken(Supplier), useValue: mockSupplierRepo },
        { provide: getRepositoryToken(Inventory), useValue: mockInventoryRepo },
        { provide: getRepositoryToken(Purchase), useValue: mockPurchaseRepo },
        { provide: getRepositoryToken(Product), useValue: mockProductRepo },
        { provide: getRepositoryToken(Branch), useValue: mockBranchRepo },
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── CREATE ───
  describe('create()', () => {
    it('should create a supplier successfully', async () => {
      mockSupplierRepo.findOneBy.mockResolvedValue(null);
      mockSupplierRepo.create.mockReturnValue(mockSupplier);
      mockSupplierRepo.save.mockResolvedValue(mockSupplier);

      const result = await service.create({
        name: 'Test Supplier',
        contactPerson: 'John Doe',
        phone: '1234567890',
        email: 'supplier@test.com',
      });

      expect(result).toEqual(mockSupplier);
      expect(mockSupplierRepo.create).toHaveBeenCalled();
      expect(mockSupplierRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if supplier already exists', async () => {
      mockSupplierRepo.findOneBy.mockResolvedValue(mockSupplier);

      await expect(
        service.create({
          name: 'Test Supplier',
          contactPerson: 'John Doe',
          phone: '1234567890',
          email: 'supplier@test.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── FIND ALL ───
  describe('findAll()', () => {
    it('should return all suppliers with relations', async () => {
      mockSupplierRepo.findAndCount.mockResolvedValue([[mockSupplier], 1]);

      const result = await service.findAll();

      expect(result.data).toEqual([mockSupplier]);
      expect(mockSupplierRepo.findAndCount).toHaveBeenCalled();
    });
  });

  // ─── FIND ONE ───
  describe('findOne()', () => {
    it('should return a supplier by id', async () => {
      mockSupplierRepo.findOne.mockResolvedValue(mockSupplier);

      const result = await service.findOne('sup-1');

      expect(result).toEqual(mockSupplier);
    });

    it('should throw NotFoundException if supplier not found', async () => {
      mockSupplierRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── UPDATE ───
  describe('update()', () => {
    it('should update a supplier', async () => {
      const updated = { ...mockSupplier, name: 'Updated Supplier' };
      mockSupplierRepo.preload.mockResolvedValue(updated);
      mockSupplierRepo.save.mockResolvedValue(updated);

      const result = await service.update('sup-1', { name: 'Updated Supplier' });

      expect(result.name).toBe('Updated Supplier');
    });

    it('should throw NotFoundException if supplier not found for update', async () => {
      mockSupplierRepo.preload.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── REMOVE ───
  describe('remove()', () => {
    it('should remove a supplier', async () => {
      mockSupplierRepo.findOne.mockResolvedValue(mockSupplier);
      mockSupplierRepo.softRemove.mockResolvedValue(mockSupplier);

      const result = await service.remove('sup-1');

      expect(result.message).toBe('Supplier removed successfully');
      expect(mockSupplierRepo.softRemove).toHaveBeenCalledWith(mockSupplier);
    });

    it('should throw NotFoundException if supplier not found for remove', async () => {
      mockSupplierRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── REFILL RECOMMENDATIONS ───
  describe('getRefillRecommendations()', () => {
    it('should return message when all stocks are above threshold', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockInventoryRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getRefillRecommendations();

      expect(result).toEqual({ message: 'All stocks are above threshold.' });
    });
  });
});
