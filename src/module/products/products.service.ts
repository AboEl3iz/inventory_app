import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductAttributeValue } from './entities/product-attribute-value.entity';
import { ProductAttribute } from './entities/product-attribute.entity';
import { ProductVariantValue } from './entities/product-variant-value.entity';
import { CreateVariantDto } from './dto/create-variant.dto';
import { CreateProductAttributeValueDto } from './dto/create-product-attribute-value.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { CreateProductAttributeDto } from './dto/create-product-attribute.dto';
import { Role } from 'src/common/decorator/roles.decorator';
import { ProductImage } from './entities/product-images.entity';
import type { IStorageProvider } from 'src/shared/storage/storage.interface';
import { STORAGE_PROVIDER } from 'src/shared/storage/storage.interface';
import { IUserPayload } from 'src/shared/interfaces/user-payload.interface';
import {
  AddVariantsResponse,
  AttributeResponse,
  AttributeValueResponse,
  GetAttributesByCategoryResponse,
  GetAttributesResponse,
  GetVariantsResponse,
  GetVariantValuesResponse,
  LinkVariantValuesResponse,
  ProductActionResponse,
  ProductDetailResponse,
  ProductFlatListResponse,
  ProductListResponse,
  ProductResponse,
  ProductSearchResponse,
  ProductStatsResponse,
  UploadImagesResponse,
  VariantResponse,
} from 'src/shared/interfaces/product-response';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(ProductAttribute)
    private readonly attributeRepo: Repository<ProductAttribute>,
    @InjectRepository(ProductAttributeValue)
    private readonly attributeValueRepo: Repository<ProductAttributeValue>,
    @InjectRepository(ProductVariantValue)
    private readonly variantValueRepo: Repository<ProductVariantValue>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(ProductImage)
    private readonly productImageRepo: Repository<ProductImage>,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: IStorageProvider,
  ) { }

  // ======================= BASIC CRUD =======================

  async create(dto: CreateProductDto, user: IUserPayload): Promise<ProductResponse> {
    const category = await this.categoryRepo.findOneBy({ id: dto.categoryId });
    if (!category) throw new NotFoundException('Category not found');

    const supplier = await this.supplierRepo.findOneBy({ id: dto.supplierId });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const product = this.productRepo.create({
      ...dto,
      category,
      supplier,
    });
    const saved = await this.productRepo.save(product);

    return {
      id: saved.id,
      name: saved.name,
      description: saved.description,
      brand: saved.brand,
      basePrice: saved.basePrice,
      isActive: saved.isActive,
      categoryId: category.id,
      categoryName: category.name,
      supplierId: supplier.id,
      supplierName: supplier.name,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async findAll(
    page = 1,
    limit = 20,
    search?: string,
    categoryId?: string,
    user?: IUserPayload,
  ): Promise<ProductListResponse> {
    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .leftJoinAndSelect('product.variants', 'variants')
      .where('product.isActive = true');

    // Restrict to branch for non-admin users
    if (user && user.role !== Role.admin)
      qb.andWhere('product.branchId = :branchId', { branchId: user.branchId });

    if (search)
      qb.andWhere('product.name ILIKE :search', { search: `%${search}%` });
    if (categoryId)
      qb.andWhere('product.categoryId = :categoryId', { categoryId });

    qb.orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [products, total] = await qb.getManyAndCount();

    return {
      data: products.map((product) => ({
        id: product.id,
        name: product.name,
        brand: product.brand,
        basePrice: product.basePrice,
        isActive: product.isActive,
        category: {
          id: product.category.id,
          name: product.category.name,
        },
        supplier: {
          id: product.supplier.id,
          name: product.supplier.name,
        },
        variantsCount: product.variants.length,
      })),
      total,
      page,
      limit,
    };
  }

  async flatList(user: IUserPayload): Promise<ProductFlatListResponse[]> {
    const where =
      user.role === Role.admin
        ? {}
        : { branch: { id: user.branchId }, isActive: true };
    return this.productRepo.find({ where, select: ['id', 'name', 'basePrice'] });
  }

  async stats(user: IUserPayload): Promise<ProductStatsResponse> {
    const baseQb = this.productRepo.createQueryBuilder('product');

    if (user.role !== Role.admin) {
      baseQb.where('product.branchId = :branchId', { branchId: user.branchId });
    }

    const [total, active, inactive] = await Promise.all([
      baseQb.clone().getCount(),
      baseQb.clone().andWhere('product.isActive = true').getCount(),
      baseQb.clone().andWhere('product.isActive = false').getCount(),
    ]);

    return { total, active, inactive };
  }

  async search(name: string, user: IUserPayload): Promise<ProductSearchResponse[]> {
    const where =
      user.role === Role.admin
        ? { name: ILike(`%${name}%`) }
        : {
          name: ILike(`%${name}%`),
          branch: { id: user.branchId },
          isActive: true,
        };
    const products = await this.productRepo.find({ where, take: 10 });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      basePrice: product.basePrice,
    }));
  }

  async findByCategory(categoryId: string, user: IUserPayload): Promise<ProductSearchResponse[]> {
    const where =
      user.role === Role.admin
        ? { category: { id: categoryId } }
        : {
          category: { id: categoryId },
          branch: { id: user.branchId },
        };
    const products = await this.productRepo.find({ where, relations: ['variants'] });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      basePrice: product.basePrice,
    }));
  }

  async findOne(id: string): Promise<ProductDetailResponse> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['category', 'supplier', 'variants', 'variants.values'],
    });
    if (!product) throw new NotFoundException('Product not found');

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      brand: product.brand,
      basePrice: product.basePrice,
      isActive: product.isActive,
      category: {
        id: product.category.id,
        name: product.category.name,
        description: product.category.description,
      },
      supplier: {
        id: product.supplier.id,
        name: product.supplier.name,
        contactPerson: product.supplier.contactPerson,
        phone: product.supplier.phone,
        email: product.supplier.email,
      },
      variants: product.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        barcode: variant.barcode ?? '',
        price: variant.price,
        costPrice: variant.costPrice,
        isActive: variant.isActive,
        valuesCount: variant.values?.length || 0,
      })),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async update(id: string, dto: UpdateProductDto, user: IUserPayload): Promise<ProductResponse> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['category', 'supplier'],
    });
    if (!product) throw new NotFoundException('Product not found');

    Object.assign(product, dto);
    const saved = await this.productRepo.save(product);

    return {
      id: saved.id,
      name: saved.name,
      description: saved.description,
      brand: saved.brand,
      basePrice: saved.basePrice,
      isActive: saved.isActive,
      categoryId: saved.category.id,
      categoryName: saved.category.name,
      supplierId: saved.supplier.id,
      supplierName: saved.supplier.name,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async remove(id: string): Promise<ProductActionResponse> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['images'],
    });
    if (!product) throw new NotFoundException('Product not found');

    await this.productRepo.softRemove(product);

    // Clean up images from storage provider
    if (product.images?.length) {
      await this.storageProvider.deleteMultipleFiles(
        product.images.map((img) => img.public_Id),
      );
      await this.productImageRepo.delete({ product: { id: product.id } });
    }

    return { status: 'deleted', id };
  }

  async restore(id: string): Promise<ProductActionResponse> {
    await this.productRepo.restore(id);
    return { status: 'restored', id };
  }

  // ======================= VARIANTS =======================

  async addVariants(productId: string, dtos: CreateVariantDto[]): Promise<AddVariantsResponse> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const variants = dtos.map((dto) =>
      this.variantRepo.create({ ...dto, product }),
    );
    const saved = await this.variantRepo.save(variants);

    return {
      product: product.name,
      variants: saved.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        barcode: variant.barcode ?? '',
        price: variant.price,
        costPrice: variant.costPrice,
        isActive: variant.isActive,
      })),
    };
  }

  async getVariants(productId: string): Promise<GetVariantsResponse[]> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const variants = await this.variantRepo.find({
      where: { product: { id: productId } },
      relations: ['values', 'values.attributeValue', 'values.attributeValue.attribute'],
    });

    return variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      barcode: variant.barcode ?? '',
      price: variant.price,
      costPrice: variant.costPrice,
      isActive: variant.isActive,
      values:
        variant.values?.map((vv) => ({
          id: vv.id,
          attributeName: vv.attributeValue.attribute.name,
          value: vv.attributeValue.value,
        })) || [],
    }));
  }

  async updateVariant(variantId: string, dto: UpdateVariantDto): Promise<VariantResponse> {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId },
      relations: ['product'],
    });
    if (!variant) throw new NotFoundException('Variant not found');

    Object.assign(variant, dto);
    const saved = await this.variantRepo.save(variant);

    return {
      id: saved.id,
      sku: saved.sku,
      barcode: saved.barcode ?? '',
      price: saved.price,
      costPrice: saved.costPrice,
      isActive: saved.isActive,
      productId: variant.product.id,
      productName: variant.product.name,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async deleteVariant(variantId: string): Promise<ProductActionResponse> {
    const variant = await this.variantRepo.findOneBy({ id: variantId });
    if (!variant) throw new NotFoundException('Variant not found');
    await this.variantRepo.softRemove(variant);
    return { status: 'deleted', id: variantId };
  }

  // ======================= ATTRIBUTES =======================

  async addAttribute(dto: CreateProductAttributeDto): Promise<AttributeResponse> {
    const category = await this.categoryRepo.findOneBy({ id: dto.categoryId });
    if (!category) throw new NotFoundException('Category not found');

    const attribute = this.attributeRepo.create({
      name: dto.name,
      category,
    });
    const saved = await this.attributeRepo.save(attribute);

    return {
      id: saved.id,
      name: saved.name,
      categoryId: category.id,
      categoryName: category.name,
      createdAt: saved.createdAt,
    };
  }

  async addAttributeValue(productId: string, dto: CreateProductAttributeValueDto): Promise<AttributeValueResponse> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const attribute = await this.attributeRepo.findOneBy({ id: dto.attributeId });
    if (!attribute) throw new NotFoundException('Attribute not found');

    const value = this.attributeValueRepo.create({
      value: dto.value,
      attribute,
      product,
    });
    const saved = await this.attributeValueRepo.save(value);

    return {
      id: saved.id,
      value: saved.value,
      attributeId: attribute.id,
      attributeName: attribute.name,
      productId: product.id,
      createdAt: saved.createdAt,
    };
  }

  async getAttributes(productId: string): Promise<GetAttributesResponse[]> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const attributes = await this.attributeValueRepo.find({
      where: { product: { id: product.id } },
      relations: ['attribute'],
    });

    return attributes.map((attr) => ({
      id: attr.id,
      value: attr.value,
      attribute: {
        id: attr.attribute.id,
        name: attr.attribute.name,
      },
    }));
  }

  async getAttributesByCategory(categoryId: string): Promise<GetAttributesByCategoryResponse[]> {
    const attributes = await this.attributeRepo.find({
      where: { category: { id: categoryId } },
      relations: ['values'],
    });

    return attributes.map((attr) => ({
      id: attr.id,
      name: attr.name,
      values:
        attr.values?.map((v) => ({
          id: v.id,
          value: v.value,
        })) || [],
    }));
  }

  // ======================= VARIANT VALUES =======================

  async linkVariantValues(variantId: string, valueIds: string[]): Promise<LinkVariantValuesResponse> {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId },
      relations: ['product', 'values'],
    });
    if (!variant) throw new NotFoundException('Variant not found');

    const values = await this.attributeValueRepo.find({
      where: { id: In(valueIds) },
      relations: ['attribute'],
    });

    const links = values.map((v) =>
      this.variantValueRepo.create({ variant, attributeValue: v }),
    );

    await this.variantValueRepo.save(links);

    return {
      variant: {
        id: variant.id,
        sku: variant.sku,
        price: variant.price,
      },
      linkedValues: values.map((v) => ({
        id: v.id,
        value: v.value,
        attributeId: v.attribute.id,
      })),
    };
  }

  async getVariantValues(variantId: string): Promise<GetVariantValuesResponse[]> {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId },
      relations: ['product'],
    });
    if (!variant) throw new NotFoundException('Variant not found');

    const variantValues = await this.variantValueRepo.find({
      where: { variant: { id: variantId } },
      relations: ['attributeValue', 'attributeValue.attribute'],
    });

    return variantValues.map((vv) => ({
      id: vv.id,
      attributeValue: {
        id: vv.attributeValue.id,
        value: vv.attributeValue.value,
        attribute: {
          id: vv.attributeValue.attribute.id,
          name: vv.attributeValue.attribute.name,
        },
      },
    }));
  }

  async uploadProductImages(productId: string, filePaths: string[], user: IUserPayload): Promise<UploadImagesResponse> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    // Use the storage provider abstraction instead of direct Cloudinary calls
    const uploadResults = await this.storageProvider.uploadMultipleImages(filePaths, 'products');

    const images = uploadResults.map((result) =>
      this.productImageRepo.create({
        url: result.secureUrl,
        public_Id: result.publicId,
        product,
      }),
    );
    await this.productImageRepo.save(images);
    product.images = images;
    await this.productRepo.save(product);

    return {
      product: product.name,
      images: images.map((img) => ({ url: img.url })),
    };
  }
}
