import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductAttributeValueDto } from './dto/create-product-attribute-value.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { CreateProductAttributeDto } from './dto/create-product-attribute.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productService: ProductsService) { }

  // basic CRUD
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.productService.findAll(page, limit, search, categoryId);
  }

  @Get('flat')
  flatList() {
    return this.productService.flatList();
  }

  @Get('stats')
  stats() {
    return this.productService.stats();
  }

  @Get('search')
  search(@Query('name') name: string) {
    return this.productService.search(name);
  }

  @Get('category/:categoryId')
  findByCategory(@Param('categoryId') categoryId: string) {
    return this.productService.findByCategory(categoryId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.productService.restore(id);
  }

  // VARIANTS (supports bulk add)
  @Post(':id/variants')
  addVariants(@Param('id') productId: string, @Body() dto: CreateVariantDto[] | CreateVariantDto) {
    // accepts single or array
    return this.productService.addVariants(productId, Array.isArray(dto) ? dto : [dto]);
  }

  @Get(':id/variants')
  getVariants(@Param('id') productId: string) {
    return this.productService.getVariants(productId);
  }

  @Patch('variants/:variantId')
  updateVariant(@Param('variantId') variantId: string, @Body() dto: UpdateVariantDto) {
    return this.productService.updateVariant(variantId, dto);
  }

  @Delete('variants/:variantId')
  deleteVariant(@Param('variantId') variantId: string) {
    return this.productService.deleteVariant(variantId);
  }

  // ATTRIBUTE VALUES (product-scoped)
  @Post(':id/attributes')
  addAttributeValue(@Param('id') productId: string, @Body() dto: CreateProductAttributeValueDto) {
    return this.productService.addAttributeValue(productId, dto);
  }

  @Get(':id/attributes')
  getAttributes(@Param('id') productId: string) {
    return this.productService.getAttributes(productId);
  }

  @Post('attributes/new')
  addAttribute(@Body() dto: CreateProductAttributeDto) {
    return this.productService.addAttribute(dto);
  }
  @Get('attributes/:categoryId')
  getAllAttributes(@Param('categoryId') categoryId: string) {
    return this.productService.getAttributesByCategory(categoryId);
  }

  // LINK VARIANT <-> ATTRIBUTE VALUES (bulk)
  @Post('variants/:variantId/values')
  linkVariantValues(
    @Param('variantId') variantId: string,
    @Body() body: { valueIds: string[] },
  ) {
    return this.productService.linkVariantValues(variantId, body.valueIds);
  }

  @Get('variants/:variantId/values')
  getVariantValues(@Param('variantId') variantId: string) {
    return this.productService.getVariantValues(variantId);
  }



}