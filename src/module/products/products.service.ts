import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Product } from './entities/product.entity';
import * as cashTypes from 'src/shared/interfaces/cash-types';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductAttributeValue } from './entities/product-attribute-value.entity';
import { ProductAttribute } from './entities/product-attribute.entity';
import { ProductVariantValue } from './entities/product-variant-value.entity';
import { CreateVariantDto } from './dto/create-variant.dto';
import { CreateProductAttributeValueDto } from './dto/create-product-attribute-value.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { CreateProductAttributeDto } from './dto/create-product-attribute.dto';
@Injectable()
export class ProductsService {

  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Category) private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Supplier) private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(ProductVariant) private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(ProductAttribute) private readonly attributeRepo: Repository<ProductAttribute>,
    @InjectRepository(ProductAttributeValue) private readonly attrValueRepo: Repository<ProductAttributeValue>,
    @InjectRepository(ProductVariantValue) private readonly variantValueRepo: Repository<ProductVariantValue>,
    @Inject(CACHE_MANAGER) private readonly cache: cashTypes.IAppCache,

  ) { }
  private async invalidateProductCaches(productId?: string) {
    // basic invalidation strategy: remove product list + product detail + category lists
    try {
      await this.cache.del('products_all');
      if (productId) await this.cache.del(`product_${productId}`);
    } catch {
      /* ignore cache errors */
    }
  }

  // ------------------ PRODUCTS CRUD ------------------
  async create(dto: CreateProductDto) {
    const category = await this.categoryRepo.findOneBy({ id: dto.categoryId });
    if (!category) throw new NotFoundException('Category not found');
    const supplier = await this.supplierRepo.findOneBy({ id: dto.supplierId });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const product = this.productRepo.create({
      name: dto.name,
      description: dto.description,
      brand: dto.brand,
      basePrice: dto.basePrice,
      isActive: dto.isActive,
      category,
      supplier,
    });
    const saved = await this.productRepo.save(product);
    await this.invalidateProductCaches(saved.id);
    return saved;
  }

  async findAll(page = 1, limit = 20, search?: string, categoryId?: string) {
    // normalize inputs
    page = Number(page) || 1;
    limit = Math.min(Number(limit) || 20, 100);

    const cacheKey = `products_all_${page}_${limit}_${search || ''}_${categoryId || ''}`;
    const cached = await this.cache.get<{ data: Product[]; total: number; page: number; limit: number }>(cacheKey);
    if (cached) return cached;

    const query = this.productRepo.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier');

    if (search) query.andWhere('product.name ILIKE :search', { search: `%${search}%` });
    if (categoryId) query.andWhere('category.id = :categoryId', { categoryId });

    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();
    const result = { data, total, page, limit };
    await this.cache.set(cacheKey, result, 60 * 5);
    return result;
  }

  async flatList() {
    const cacheKey = 'products_flat';
    const cached = await this.cache.get<Product[]>(cacheKey);
    if (cached) return cached;
    const list = await this.productRepo.find({ select: ['id', 'name', 'basePrice'] });
    await this.cache.set(cacheKey, list, 60 * 5);
    return list;
  }

  async findOne(id: string) {
    const cacheKey = `product_${id}`;
    const cached = await this.cache.get<Product>(cacheKey);
    if (cached) return cached;

    const product = await this.productRepo.findOne({
      where: { id },
      relations: [
        'variants',
        'attributeValues', // your entity name
        'variants.values',
        'category',
        'supplier',
      ],
      withDeleted: true,
    });
    if (!product) throw new NotFoundException('Product not found');
    await this.cache.set(cacheKey, product, 60 * 10);
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.productRepo.findOneBy({ id });
    if (!product) throw new NotFoundException('Product not found');
    Object.assign(product, dto);
    const updated = await this.productRepo.save(product);
    await this.invalidateProductCaches(id);
    return updated;
  }

  async remove(id: string) {
    const product = await this.productRepo.findOneBy({ id });
    if (!product) throw new NotFoundException('Product not found');
    await this.productRepo.softRemove(product);
    await this.invalidateProductCaches(id);
    return { message: 'Product soft deleted' };
  }

  async restore(id: string) {
    await this.productRepo.restore(id);
    await this.invalidateProductCaches(id);
    return { message: 'Product restored' };
  }

  // ------------------ SEARCH / STATS / FILTER ------------------
  async search(name: string) {
    if (!name) return [];
    return this.productRepo.find({
      where: { name: ILike(`%${name}%`) },
      relations: ['category'],
    });
  }

  async findByCategory(categoryId: string) {
    const cacheKey = `products_category_${categoryId}`;
    const cached = await this.cache.get<Product[]>(cacheKey);
    if (cached) return cached;

    const data = await this.productRepo.find({
      where: { category: { id: categoryId } },
      relations: ['category', 'variants'],
    });
    await this.cache.set(cacheKey, data, 60 * 10);
    return data;
  }

  async stats() {
    const cacheKey = 'product_stats';
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // use lower-case alias to avoid Postgres alias issues
    const raw = await this.productRepo
      .createQueryBuilder('product')
      .leftJoin('product.category', 'category')
      .select('category.id', 'category_id')
      .addSelect('category.name', 'category_name')
      .addSelect('COUNT(product.id)', 'product_count')
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('product_count', 'DESC')
      .getRawMany();

    // map types
    const stats = raw.map(r => ({
      categoryId: r.category_id,
      categoryName: r.category_name,
      productCount: Number(r.product_count),
    }));

    await this.cache.set(cacheKey, stats, 60 * 10);
    return stats;
  }

  // ------------------ VARIANTS ------------------
  // addVariants: accepts bulk array to reduce endpoints
  async addVariants(productId: string, dtos: CreateVariantDto[]) {
    const product = await this.productRepo.findOneBy({ id: productId });
    if (!product) throw new NotFoundException('Product not found');

    const entities = dtos.map(dto => this.variantRepo.create({ ...dto, product }));
    const saved = await this.variantRepo.save(entities);
    await this.invalidateProductCaches(productId);
    return saved;
  }

  async getVariants(productId: string) {
    const variants = await this.variantRepo.find({
      where: { product: { id: productId } },
      relations: [
        'product',
        'values',
        'values.attributeValue',
        'values.attributeValue.attribute',
      ],
    });

    // نرتب القيم حسب الـ attribute
    const formattedVariants = variants.map((variant) => {
      const groupedAttributes = {};

      for (const val of variant.values) {
        const attr = val.attributeValue.attribute;
        const value = val.attributeValue.value;

        if (!groupedAttributes[attr.id]) {
          groupedAttributes[attr.id] = {
            id: attr.id,
            name: attr.name,
            price : variant.price,
            values: [],
          };
        }

        groupedAttributes[attr.id].values.push({
          id: val.attributeValue.id,
          value,
        });
      }

      return {
        id: variant.id,
        sku: variant.sku,
        BasePrice: variant.product.basePrice,
        costPrice: variant.costPrice,
        stockQuantity: variant.stockQuantity,
        isActive: variant.isActive,
        attributes: Object.values(groupedAttributes),
      };
    });

    return formattedVariants;
  }


  async updateVariant(variantId: string, dto: UpdateVariantDto) {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId },
      relations: [
        'values',
        'values.attributeValue',
        'values.attributeValue.attribute',
        'product',
      ],
    });

    if (!variant) throw new NotFoundException('Variant not found');

    // تحديث البيانات الأساسية
    Object.assign(variant, dto);
    const saved = await this.variantRepo.save(variant);

    // إبطال الكاش القديم
    await this.invalidateProductCaches(variant.product?.id);

    // بعد التحديث نرتب نفس شكل البيانات النهائي
    const groupedAttributes = {};

    for (const val of variant.values) {
      const attr = val.attributeValue.attribute;
      const value = val.attributeValue.value;

      if (!groupedAttributes[attr.id]) {
        groupedAttributes[attr.id] = {
          id: attr.id,
          name: attr.name,
          values: [],
        };
      }

      groupedAttributes[attr.id].values.push({
        id: val.attributeValue.id,
        value,
      });
    }

    return {
      id: saved.id,
      sku: saved.sku,
      price: saved.price,
      costPrice: saved.costPrice,
      stockQuantity: saved.stockQuantity,
      isActive: saved.isActive,
      attributes: Object.values(groupedAttributes),
    };
  }


  async deleteVariant(variantId: string) {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId },
      relations: ['product'],
    });
    if (!variant) throw new NotFoundException('Variant not found');
    await this.variantRepo.remove(variant);
    await this.invalidateProductCaches(variant.product?.id);
    return { message: 'Variant deleted' };
  }

  // ------------------ ATTRIBUTE VALUES (product-scoped) ------------------
  async addAttributeValue(productId: string, dto: CreateProductAttributeValueDto) {
    const product = await this.productRepo.findOneBy({ id: productId });
    if (!product) throw new NotFoundException('Product not found');

    const attribute = await this.attributeRepo.findOneBy({ id: dto.attributeId });
    if (!attribute) throw new NotFoundException('Attribute not found');

    const value = this.attrValueRepo.create({
      value: dto.value,
      product,
      attribute,
    });
    const saved = await this.attrValueRepo.save(value);
    await this.invalidateProductCaches(productId);
    return saved;
  }

  async getAttributes(productId: string) {
    return this.attrValueRepo.find({
      where: { product: { id: productId } },
      relations: ['attribute'],
    });
  }
  async getAttributesByCategory(categorytId: string) {
    return this.attributeRepo.find({
      where: { category: { id: categorytId } },
      relations: ['values', 'category'],
    });
  }
  // product.service.ts
  async addAttribute(dto: CreateProductAttributeDto) {
    const category = await this.categoryRepo.findOneBy({ id: dto.categoryId });
    if (!category) throw new NotFoundException('Category not found');

    const exists = await this.attributeRepo.findOne({
      where: { name: dto.name, category: { id: dto.categoryId } },
    });
    if (exists) throw new BadRequestException('Attribute already exists in this category');

    const attribute = this.attributeRepo.create({
      name: dto.name,
      category,
    });

    const saved = await this.attributeRepo.save(attribute);
    await this.invalidateProductCaches(dto.categoryId);
    return saved;
  }


  // ------------------ VARIANT <-> ATTRIBUTE VALUE LINKING ------------------
  async linkVariantValues(variantId: string, valueIds: string[]) {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId },
      relations: ['product'],
    });
    if (!variant) throw new NotFoundException('Variant not found');

    const values = await this.attrValueRepo.find({
      where: { id: In(valueIds) },
      relations: ['attribute'],
    });

    if (values.length === 0)
      throw new BadRequestException('No valid attribute values found');

    // امسح القديم لو موجود
    await this.variantValueRepo.delete({ variant: { id: variantId } });

    // اربط الجديد
    const links = values.map((v) =>
      this.variantValueRepo.create({
        variant,
        attributeValue: v,
      }),
    );

    await this.variantValueRepo.save(links);

    // cache invalidation
    await this.invalidateProductCaches(variant.product.id);

    // response بسيط ومنسق
    return {
      variantId,
      linkedValues: values.map((v) => ({
        id: v.id,
        value: v.value,
        attribute: {
          id: v.attribute.id,
          name: v.attribute.name,
        },
      })),
    };
  }


  async getVariantValues(variantId: string) {
    const cacheKey = `variant_values_${variantId}`;

    // نحاول نجيب من الكاش الأول
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const variantValues = await this.variantValueRepo.find({
      where: { variant: { id: variantId } },
      relations: [
        'variant',
        'variant.product',
        'attributeValue',
        'attributeValue.attribute',
      ],
    });

    if (variantValues.length === 0) {
      throw new NotFoundException('No attribute values found for this variant');
    }

    // group حسب attribute
    const grouped: Record<string, { id: string; name: string; values: any[] }> = {};

    for (const vv of variantValues) {
      const attr = vv.attributeValue.attribute;
      if (!grouped[attr.id]) {
        grouped[attr.id] = {
          id: attr.id,
          name: attr.name,
          values: [],
        };
      }
      grouped[attr.id].values.push({
        id: vv.attributeValue.id,
        value: vv.attributeValue.value,
      });
    }

    // الشكل النهائي للـ output
    const result = {
      variantId: variantId,
      sku: variantValues[0].variant.sku,
      productName: variantValues[0].variant.product.name,
      attributes: Object.values(grouped),
    };

    // نخزّن النتيجة في الكاش لمدة 5 دقايق
    await this.cache.set(cacheKey, result, 1000 * 60 * 5);

    return result;
  }



}
