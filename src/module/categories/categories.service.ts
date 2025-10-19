import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from './entities/category.entity';
import * as cashTypes from 'src/shared/interfaces/cash-types';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
    @Inject(CACHE_MANAGER) private cacheManager: cashTypes.IAppCache,
  ) {

  }
  async create(dto: CreateCategoryDto) {
    const category = this.categoryRepo.create({ name: dto.name });

    if (dto.parentId) {
      const parent = await this.categoryRepo.findOne({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent category not found');
      category.parent = parent;
    }

    await this.cacheManager.del('categories_tree');
    return await this.categoryRepo.save(category);
  }

  async findAll() {
    const cacheKey = 'categories_tree';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const categories = await this.categoryRepo.find({ relations: ['children', 'parent'] });
    await this.cacheManager.set(cacheKey, categories, 60 * 5);
    return categories;
  }

  async findFlat() {
    const cacheKey = 'categories_flat';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const categories = await this.categoryRepo.find({ select: ['id', 'name'] });
    await this.cacheManager.set(cacheKey, categories, 60 * 5);
    return categories;
  }

  async findOne(id: string) {
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
      })),
    };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    Object.assign(category, dto);
    await this.cacheManager.del('categories_tree');
    return await this.categoryRepo.save(category);
  }

  async remove(id: string) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    await this.categoryRepo.softRemove(category);
    await this.cacheManager.del('categories_tree');
    return { message: 'Category soft deleted' };
  }

  async restore(id: string) {
    await this.categoryRepo.restore(id);
    await this.cacheManager.del('categories_tree');
    return { message: 'Category restored successfully' };
  }

  async stats() {
    const cacheKey = 'categories_stats';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

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


    await this.cacheManager.set(cacheKey, stats, 60 * 5);
    return stats;
  }

  async search(name: string) {
    return await this.categoryRepo
      .createQueryBuilder('category')
      .where('LOWER(category.name) LIKE LOWER(:name)', { name: `%${name}%` })
      .getMany();
  }

  async getCategoryTree() {
    const cacheKey = 'categories_tree';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const categories = await this.categoryRepo.find({
      relations: ['children', 'parent'],
      where: { parent: IsNull() }, // نجيب الـ roots فقط
    });

    const tree = categories.map((c) => this.buildTree(c));
    await this.cacheManager.set(cacheKey, tree, 60 * 5);
    return tree;
  }

  private buildTree(category: Category): any {
    return {
      id: category.id,
      name: category.name,
      children: category.children?.map((child) => this.buildTree(child)) || [],
    };
  }

}
