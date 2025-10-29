import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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
import { IFilterProducts, IGetVariantResponse, ILinkedVariant, IStats, IVariant } from 'src/shared/interfaces/product-response';
import { Role } from 'src/common/decorator/roles.decorator';
import { ProductImage } from './entities/product-images.entity';
import { deleteMultipleFromCloudinary, uploadImageToCloudinary, uploadMultipleImagesToCloudinary } from 'src/shared/cloudinary';
import { UploadApiResponse } from 'cloudinary';
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

  ) { }

  // ======================= BASIC CRUD =======================

  async create(dto: CreateProductDto, user: any) {
    if (user.role === Role.cashier)
      throw new ForbiddenException('Cashier cannot create products.');

    const category = await this.categoryRepo.findOneBy({ id: dto.categoryId });
    if (!category) throw new NotFoundException('Category not found');

    const supplier = await this.supplierRepo.findOneBy({ id: dto.supplierId });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const product = this.productRepo.create({
      ...dto,
      category,
      supplier,
    });
    return this.productRepo.save(product);
  }

  async findAll(
    page = 1,
    limit = 20,
    search?: string,
    categoryId?: string,
    user?: any,
  ) {
    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .leftJoinAndSelect('product.variants', 'variants')
      .where('product.isActive = true');

    // restrict to branch
    if (user.role !== Role.admin)
      qb.andWhere('product.branchId = :branchId', { branchId: user.branchId });

    // filters
    if (search)
      qb.andWhere('product.name ILIKE :search', { search: `%${search}%` });
    if (categoryId)
      qb.andWhere('product.categoryId = :categoryId', { categoryId });

    qb.skip((page - 1) * limit).take(limit);
    return qb.getManyAndCount();
  }

  async flatList(user: any) {
    const where =
      user.role === Role.admin
        ? {}
        : { branch: { id: user.branchId }, isActive: true };
    return this.productRepo.find({ where, select: ['id', 'name', 'basePrice'] });
  }

  async stats(user: any) {
    if (user.role === Role.cashier)
      throw new ForbiddenException('Cashier cannot view stats.');

    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoin('product.variants', 'variant');

    if (user.role !== Role.admin)
      qb.where('product.branchId = :branchId', { branchId: user.branchId });

    const [total, active, inactive] = await Promise.all([
      qb.getCount(),
      qb.clone().where('product.isActive = true').getCount(),
      qb.clone().where('product.isActive = false').getCount(),
    ]);

    return { total, active, inactive };
  }

  async search(name: string, user: any) {
    const where =
      user.role === Role.admin
        ? { name: ILike(`%${name}%`) }
        : {
          name: ILike(`%${name}%`),
          branch: { id: user.branchId },
          isActive: true,
        };
    return this.productRepo.find({ where, take: 10 });
  }

  async findByCategory(categoryId: string, user: any) {
    const where =
      user.role === Role.admin
        ? { category: { id: categoryId } }
        : {
          category: { id: categoryId },
          branch: { id: user.branchId },
        };
    return this.productRepo.find({ where, relations: ['variants'] });
  }

  async findOne(id: string, user: any) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['category', 'supplier', 'variants', 'variants.values'],
    });
    if (!product) throw new NotFoundException('Product not found');


    return product;
  }

  async update(id: string, dto: UpdateProductDto, user: any) {
    const product = await this.findOne(id, user);
    if (user.role === Role.cashier)
      throw new ForbiddenException('Cashier cannot update products.');

    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async remove(id: string, user: any) {
    if (user.role !== Role.admin)
      throw new ForbiddenException('Only admin can delete products.');

    const product = await this.productRepo.findOneBy({ id });
    if (!product) throw new NotFoundException('Product not found');
    await this.productRepo.softRemove(product);
    await this.productImageRepo.delete({ product: { id: product.id } });
    await deleteMultipleFromCloudinary(
      product.images.map((img) => img.public_Id),
    );
    return { status: 'deleted', id };
  }

  async restore(id: string, user: any) {
    if (user.role !== Role.admin)
      throw new ForbiddenException('Only admin can restore products.');

    await this.productRepo.restore(id);
    return { status: 'restored', id };
  }

  // ======================= VARIANTS =======================

  async addVariants(productId: string, dtos: CreateVariantDto[], user: any) {
    const product = await this.findOne(productId, user);
    if (user.role === Role.cashier)
      throw new ForbiddenException('Cashier cannot add variants.');

    const variants = dtos.map((dto) =>
      this.variantRepo.create({ ...dto, product }),
    );
    await this.variantRepo.save(variants);
    return {
      product: product.name,
      variants: variants,
    }
  }

  async getVariants(productId: string, user: any) {
    await this.findOne(productId, user);
   return this.variantRepo.find({
      where: { product: { id: productId } },
      relations: ['values', 'values.attribute' , ''],
    });

  
  }

  async updateVariant(variantId: string, dto: UpdateVariantDto, user: any) {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId },
      relations: ['product', 'product.branch'],
    });
    if (!variant) throw new NotFoundException('Variant not found');



    Object.assign(variant, dto);
    return this.variantRepo.save(variant);
  }

  async deleteVariant(variantId: string, user: any) {
    if (user.role !== Role.admin)
      throw new ForbiddenException('Only admin can delete variants.');

    const variant = await this.variantRepo.findOneBy({ id: variantId });
    if (!variant) throw new NotFoundException('Variant not found');
    await this.variantRepo.softRemove(variant);
    return { status: 'deleted', id: variantId };
  }

  // ======================= ATTRIBUTES =======================

  async addAttribute(dto: CreateProductAttributeDto, user: any) {
    if (user.role === Role.cashier)
      throw new ForbiddenException('Cashier cannot create attributes.');

    const category = await this.categoryRepo.findOneBy({ id: dto.categoryId });
    if (!category) throw new NotFoundException('Category not found');

    const attribute = this.attributeRepo.create({
      name: dto.name,
      category,
    });
    return this.attributeRepo.save(attribute);
  }

  async addAttributeValue(productId: string, dto: CreateProductAttributeValueDto, user: any) {
    const product = await this.findOne(productId, user);
    if (user.role === Role.cashier)
      throw new ForbiddenException('Cashier cannot add attribute values.');

    const attribute = await this.attributeRepo.findOneBy({ id: dto.attributeId });
    if (!attribute) throw new NotFoundException('Attribute not found');

    const value = this.attributeValueRepo.create({
      value: dto.value,
      attribute,
      product,
    });
    return this.attributeValueRepo.save(value);
  }

  async getAttributes(productId: string, user: any) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    return this.attributeValueRepo.find({
      where: { product: { id: product.id } },
      relations: ['attribute'],
    });
  }

  async getAttributesByCategory(categoryId: string, user: any) {
    const attributes = await this.attributeRepo.find({
      where: { category: { id: categoryId } },
      relations: ['values'],
    });
    return attributes;
  }

  // ======================= VARIANT VALUES =======================

  async linkVariantValues(variantId: string, valueIds: string[], user: any) {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId },
      relations: ['product', 'values'],
    });
    if (!variant) throw new NotFoundException('Variant not found');



    const values = await this.attributeValueRepo.findBy({ id: In(valueIds) });
    const links = values.map((v) =>
      this.variantValueRepo.create({ variant, attributeValue: v }),
    );

    await this.variantValueRepo.save(links);
    return {
      variant: variant,
      linkedValues: links.map((link) => link.attributeValue),
    }
  }

  async getVariantValues(variantId: string, user: any) {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId },
      relations: ['product'],
    });
    if (!variant) throw new NotFoundException('Variant not found');



    return this.variantValueRepo.find({
      where: { variant: { id: variantId } },
      relations: ['attributeValue', 'attributeValue.attribute'],
    });
  }

  async uploadProductImages(productId: string, imageUrls: string[], user: any) {
    const product = await this.findOne(productId, user);
    if (user.role === Role.cashier)
      throw new ForbiddenException('Cashier cannot upload product images.');
    const response: UploadApiResponse[] = await uploadMultipleImagesToCloudinary(imageUrls, 'products');
    const images = response.map((url) =>

      this.productImageRepo.create({
        url: url.secure_url,
        public_Id: url.public_id,
        product
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
