import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockCategory = {
  id: 'cat-1',
  name: 'Electronics',
  description: 'Electronic devices',
  parent: null,
  children: [],
  products: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCategoryRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  softRemove: jest.fn(),
  restore: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: mockCategoryRepo },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── CREATE ───
  describe('create()', () => {
    it('should create a category without parent', async () => {
      mockCategoryRepo.create.mockReturnValue(mockCategory);
      mockCategoryRepo.save.mockResolvedValue(mockCategory);
      mockCacheManager.del.mockResolvedValue(undefined);

      const result = await service.create({ name: 'Electronics', description: 'Electronic devices' });

      expect(result).toEqual({
        id: mockCategory.id,
        name: mockCategory.name,
        description: mockCategory.description,
        parentId: null,
        parentName: null,
        createdAt: mockCategory.createdAt,
        updatedAt: mockCategory.updatedAt,
      });
      expect(mockCategoryRepo.create).toHaveBeenCalled();
      expect(mockCategoryRepo.save).toHaveBeenCalled();
      expect(mockCacheManager.del).toHaveBeenCalledWith('categories_tree');
    });

    it('should create a category with parent', async () => {
      const parentCat = { ...mockCategory, id: 'parent-1', name: 'Parent' };
      const childCat = { ...mockCategory, id: 'child-1', name: 'Child', parent: parentCat };

      mockCategoryRepo.create.mockReturnValue(childCat);
      mockCategoryRepo.findOne.mockResolvedValue(parentCat);
      mockCategoryRepo.save.mockResolvedValue(childCat);
      mockCacheManager.del.mockResolvedValue(undefined);

      const result = await service.create({ name: 'Child', parentId: 'parent-1' });

      expect(result.parentId).toBe('parent-1');
      expect(result.parentName).toBe('Parent');
    });

    it('should throw NotFoundException if parent not found', async () => {
      mockCategoryRepo.create.mockReturnValue(mockCategory);
      mockCategoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({ name: 'Child', parentId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── FIND ALL ───
  describe('findAll()', () => {
    it('should return cached categories if available', async () => {
      const cachedData = [{ id: 'cat-1', name: 'Cached' }];
      mockCacheManager.get.mockResolvedValue(cachedData);

      const result = await service.findAll();

      expect(result).toEqual(cachedData);
      expect(mockCategoryRepo.find).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache if not cached', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockCategoryRepo.find.mockResolvedValue([mockCategory]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Electronics');
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });

  // ─── FIND ONE ───
  describe('findOne()', () => {
    it('should return category detail', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(mockCategory);

      const result = await service.findOne('cat-1');

      expect(result.id).toBe('cat-1');
      expect(result.name).toBe('Electronics');
    });

    it('should throw NotFoundException if not found', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── UPDATE ───
  describe('update()', () => {
    it('should update a category', async () => {
      const updated = { ...mockCategory, name: 'Updated Electronics' };
      mockCategoryRepo.findOne.mockResolvedValue({ ...mockCategory });
      mockCategoryRepo.save.mockResolvedValue(updated);

      const result = await service.update('cat-1', { name: 'Updated Electronics' });

      expect(result.name).toBe('Updated Electronics');
      expect(mockCacheManager.del).toHaveBeenCalledWith('categories_tree');
    });

    it('should throw NotFoundException if category not found for update', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if setting self as parent', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(mockCategory);

      await expect(
        service.update('cat-1', { parentId: 'cat-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── REMOVE ───
  describe('remove()', () => {
    it('should soft delete a category', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(mockCategory);
      mockCategoryRepo.softRemove.mockResolvedValue(mockCategory);

      const result = await service.remove('cat-1');

      expect(result.message).toBe('Category soft deleted');
      expect(mockCacheManager.del).toHaveBeenCalledWith('categories_tree');
    });

    it('should throw NotFoundException if category not found for delete', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── RESTORE ───
  describe('restore()', () => {
    it('should restore a soft-deleted category', async () => {
      mockCategoryRepo.restore.mockResolvedValue({ affected: 1 });

      const result = await service.restore('cat-1');

      expect(result.message).toBe('Category restored successfully');
    });
  });

  // ─── FIND FLAT ───
  describe('findFlat()', () => {
    it('should return cached flat list', async () => {
      const flat = [{ id: 'cat-1', name: 'Electronics' }];
      mockCacheManager.get.mockResolvedValue(flat);

      const result = await service.findFlat();
      expect(result).toEqual(flat);
    });

    it('should fetch from DB if not cached', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockCategoryRepo.find.mockResolvedValue([{ id: 'cat-1', name: 'Electronics' }]);

      const result = await service.findFlat();
      expect(result).toHaveLength(1);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });

  // ─── SEARCH ───
  describe('search()', () => {
    it('should search categories by name', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockCategory]),
      };
      mockCategoryRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.search('Elec');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Electronics');
    });
  });

  // ─── STATS ───
  describe('stats()', () => {
    it('should return cached stats', async () => {
      const stats = [{ id: 'cat-1', name: 'Electronics', productcount: 5 }];
      mockCacheManager.get.mockResolvedValue(stats);

      const result = await service.stats();
      expect(result).toEqual(stats);
    });

    it('should query and cache stats if not cached', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ id: 'cat-1', name: 'Electronics', productcount: '5' }]),
      };
      mockCategoryRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.stats();
      expect(result[0].productcount).toBe(5);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });
});
