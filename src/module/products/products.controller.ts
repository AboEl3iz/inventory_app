import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductAttributeValueDto } from './dto/create-product-attribute-value.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { CreateProductAttributeDto } from './dto/create-product-attribute.dto';
import { Roles, Role } from 'src/common/decorator/roles.decorator';
import { AuthenticationGuard } from 'src/common/guard/authentication.guard';
import { AuthorizationGuard } from 'src/common/guard/authorization.guard';

@Controller('products')
@UseGuards(AuthenticationGuard,AuthorizationGuard)
export class ProductsController {
  constructor(private readonly productService: ProductsService) { }

    // ------------------- BASIC CRUD -------------------

  // only admin or manager can create new products
  @Roles(Role.admin, Role.manager)
  @Post()
  create(@Body() dto: CreateProductDto, @Req() req) {
    const user = req.user; // contains branchId and role
    return this.productService.create(dto, user);
  }

  

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Req() req?,
  ) {
    const user = req.user;
    return this.productService.findAll(page, limit, search, categoryId, user);
  }

  @Get('flat')
  flatList(@Req() req) {
    const user = req.user;
    return this.productService.flatList(user);
  }

  @Roles(Role.admin, Role.manager)
  @Get('stats')
  stats(@Req() req) {
    const user = req.user;
    return this.productService.stats(user);
  }

  @Get('search')
  search(@Query('name') name: string, @Req() req) {
    const user = req.user;
    return this.productService.search(name, user);
  }

  @Get('category/:categoryId')
  findByCategory(@Param('categoryId') categoryId: string, @Req() req) {
    const user = req.user;
    return this.productService.findByCategory(categoryId, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    const user = req.user;
    return this.productService.findOne(id, user);
  }

  @Roles(Role.admin, Role.manager)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @Req() req) {
    const user = req.user;
    return this.productService.update(id, dto, user);
  }

  @Roles(Role.admin)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    const user = req.user;
    return this.productService.remove(id, user);
  }

  @Roles(Role.admin)
  @Patch(':id/restore')
  restore(@Param('id') id: string, @Req() req) {
    const user = req.user;
    return this.productService.restore(id, user);
  }

  // ------------------- VARIANTS -------------------

  @Roles(Role.admin, Role.manager)
  @Post(':id/variants')
  addVariants(
    @Param('id') productId: string,
    @Body() dto: CreateVariantDto[] | CreateVariantDto,
    @Req() req,
  ) {
    const user = req.user;
    return this.productService.addVariants(
      productId,
      Array.isArray(dto) ? dto : [dto],
      user,
    );
  }

  @Get(':id/variants')
  getVariants(@Param('id') productId: string, @Req() req) {
    const user = req.user;
    return this.productService.getVariants(productId, user);
  }

  @Roles(Role.admin, Role.manager)
  @Patch('variants/:variantId')
  updateVariant(
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
    @Req() req,
  ) {
    const user = req.user;
    return this.productService.updateVariant(variantId, dto, user);
  }

  @Roles(Role.admin)
  @Delete('variants/:variantId')
  deleteVariant(@Param('variantId') variantId: string, @Req() req) {
    const user = req.user;
    return this.productService.deleteVariant(variantId, user);
  }

  // ------------------- ATTRIBUTE VALUES -------------------

  @Roles(Role.admin, Role.manager)
  @Post(':id/attributes')
  addAttributeValue(
    @Param('id') productId: string,
    @Body() dto: CreateProductAttributeValueDto,
    @Req() req,
  ) {
    const user = req.user;
    return this.productService.addAttributeValue(productId, dto, user);
  }

  @Get(':id/attributes')
  getAttributes(@Param('id') productId: string, @Req() req) {
    const user = req.user;
    return this.productService.getAttributes(productId, user);
  }

  @Roles(Role.admin, Role.manager)
  @Post('attributes/new')
  addAttribute(@Body() dto: CreateProductAttributeDto, @Req() req) {
    const user = req.user;
    return this.productService.addAttribute(dto, user);
  }

  @Get('attributes/:categoryId')
  getAllAttributes(@Param('categoryId') categoryId: string, @Req() req) {
    const user = req.user;
    return this.productService.getAttributesByCategory(categoryId, user);
  }

  // ------------------- VARIANT <-> ATTRIBUTE VALUES -------------------

  @Roles(Role.admin, Role.manager)
  @Post('variants/:variantId/values')
  linkVariantValues(
    @Param('variantId') variantId: string,
    @Body() body: { valueIds: string[] },
    @Req() req,
  ) {
    const user = req.user;
    return this.productService.linkVariantValues(variantId, body.valueIds, user);
  }

  @Get('variants/:variantId/values')
  getVariantValues(@Param('variantId') variantId: string, @Req() req) {
    const user = req.user;
    return this.productService.getVariantValues(variantId, user);
  }




}