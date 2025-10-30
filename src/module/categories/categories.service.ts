import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from './entities/category.entity';
import * as cashTypes from 'src/shared/interfaces/cash-types';
import { CategoryActionResponse, CategoryDetailResponse, CategoryFlatResponse, CategoryResponse, CategoryStatsResponse, CategoryTreeItemResponse } from 'src/shared/interfaces/category-reponse';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
    @Inject(CACHE_MANAGER) private cacheManager: cashTypes.IAppCache,
  ) {

  }
  async create(dto: CreateCategoryDto): Promise<CategoryResponse> {
    const category = this.categoryRepo.create({ 
      name: dto.name,
      description: dto.description 
    });

    if (dto.parentId) {
      const parent = await this.categoryRepo.findOne({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent category not found');
      category.parent = parent;
    }

    await this.cacheManager.del('categories_tree');
    await this.cacheManager.del('categories_flat');
    const saved = await this.categoryRepo.save(category);

    return {
      id: saved.id,
      name: saved.name,
      description: saved.description,
      parentId: saved.parent?.id || null,
      parentName: saved.parent?.name || null,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async findAll(): Promise<CategoryResponse[]> {
    const cacheKey = 'categories_tree';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached as CategoryResponse[];

    const categories = await this.categoryRepo.find({ relations: ['children', 'parent'] });
    
    const response = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      parentId: cat.parent?.id || null,
      parentName: cat.parent?.name || null,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }));

    await this.cacheManager.set(cacheKey, response, 60 * 5);
    return response;
  }

  async findFlat(): Promise<CategoryFlatResponse[]> {
    const cacheKey = 'categories_flat';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached as CategoryFlatResponse[]; 

    const categories = await this.categoryRepo.find({ select: ['id', 'name'] });
    await this.cacheManager.set(cacheKey, categories, 60 * 5);
    return categories;
  }

  async findOne(id: string): Promise<CategoryDetailResponse> {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ['children', 'products', 'parent'],
    });
    if (!category) throw new NotFoundException('Category not found');

    return {
      id: category.id,
      name: category.name,
      parent: category.parent ? { id: category.parent.id, name: category.parent.name } : null,
      productsCount: category.products?.length || 0,
      children: category.children?.map((child) => ({
        id: child.id,
        name: child.name,
      })) || [],
    };
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponse> {
    const category = await this.categoryRepo.findOne({ 
      where: { id },
      relations: ['parent']
    });
    if (!category) throw new NotFoundException('Category not found');

    if (dto.name) category.name = dto.name;
    if (dto.description !== undefined) category.description = dto.description;

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }
      const parent = await this.categoryRepo.findOne({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent category not found');
      category.parent = parent;
    }

    await this.cacheManager.del('categories_tree');
    await this.cacheManager.del('categories_flat');
    await this.cacheManager.del('categories_stats');
    const saved = await this.categoryRepo.save(category);

    return {
      id: saved.id,
      name: saved.name,
      description: saved.description,
      parentId: saved.parent?.id || null,
      parentName: saved.parent?.name || null,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async remove(id: string): Promise<CategoryActionResponse> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    await this.categoryRepo.softRemove(category);
    await this.cacheManager.del('categories_tree');
    await this.cacheManager.del('categories_flat');
    await this.cacheManager.del('categories_stats');
    return { message: 'Category soft deleted' };
  }

  async restore(id: string): Promise<CategoryActionResponse> {
    await this.categoryRepo.restore(id);
    await this.cacheManager.del('categories_tree');
    await this.cacheManager.del('categories_flat');
    await this.cacheManager.del('categories_stats');
    return { message: 'Category restored successfully' };
  }

  async stats(): Promise<CategoryStatsResponse[]> {
    const cacheKey = 'categories_stats';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached as CategoryStatsResponse[];

    const stats = await this.categoryRepo
      .createQueryBuilder('category')
      .leftJoin('category.products', 'product')
      .select('category.id', 'id')
      .addSelect('category.name', 'name')
      .addSelect('COUNT(product.id)', 'productcount')
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('productcount', 'DESC')
      .getRawMany();

    const response = stats.map(stat => ({
      id: stat.id,
      name: stat.name,
      productcount: parseInt(stat.productcount),
    }));

    await this.cacheManager.set(cacheKey, response, 60 * 5);
    return response;
  }

  async search(name: string): Promise<CategoryFlatResponse[]> {
    const categories = await this.categoryRepo
      .createQueryBuilder('category')
      .where('LOWER(category.name) LIKE LOWER(:name)', { name: `%${name}%` })
      .getMany();

    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
    }));
  }

  async getCategoryTree(): Promise<CategoryTreeItemResponse[]> {
    const cacheKey = 'categories_tree_structured';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached as CategoryTreeItemResponse[];

    const categories = await this.categoryRepo.find({
      relations: ['children', 'parent'],
      where: { parent: IsNull() }, // نجيب الـ roots فقط
    });

    const tree = categories.map((c) => this.buildTree(c));
    await this.cacheManager.set(cacheKey, tree, 60 * 5);
    return tree;
  }

  private buildTree(category: Category): CategoryTreeItemResponse {
    return {
      id: category.id,
      name: category.name,
      children: category.children?.map((child) => this.buildTree(child)) || [],
    };
  }

}
