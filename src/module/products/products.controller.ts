import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards, UseInterceptors, UploadedFile, UploadedFiles, BadRequestException } from '@nestjs/common';
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
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
@Controller('products')
@ApiTags('Products')
@ApiBearerAuth('access-token')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class ProductsController {
  constructor(private readonly productService: ProductsService) { }

  // ------------------- BASIC CRUD -------------------

  // only admin or manager can create new products
  @Roles(Role.admin, Role.manager)
  @Post()
  @ApiOperation({ summary: 'Create a new product', description: 'Create a new product. Only admin and manager can perform this action.' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid product data' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  create(@Body() dto: CreateProductDto, @Req() req) {
    const user = req.user; // contains branchId and role
    return this.productService.create(dto, user);
  }

  @Roles(Role.admin, Role.manager)
  @Post(':productId/images')
  @ApiOperation({ summary: 'Upload product images', description: 'Upload up to 5 product images' })
  @ApiParam({ name: 'productId', description: 'Product ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Product images (JPEG, PNG, JPG, WEBP - max 5 files, 5MB each)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Images uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file format or size' })
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      storage: diskStorage({
        destination: 'src/uploads/products',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB per file
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|jpg|webp)$/)) {
          return cb(new BadRequestException('Only image files (jpeg, jpg, png, webp) are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Param('productId') productId: string,
    @Req() req,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No images uploaded');
    }

    return this.productService.uploadProductImages(
      productId,
      files.map(file => file.path),
      req.user,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all products', description: 'Retrieve all products with optional pagination and filtering' })
  @ApiQuery({ name: 'page', type: 'number', required: false, description: 'Page number (starts from 1)' })
  @ApiQuery({ name: 'limit', type: 'number', required: false, description: 'Number of items per page' })
  @ApiQuery({ name: 'search', type: 'string', required: false, description: 'Search by product name or description' })
  @ApiQuery({ name: 'categoryId', type: 'string', required: false, description: 'Filter by category UUID' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
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
  @ApiOperation({ summary: 'Get flat products list', description: 'Get a simplified list of all products without pagination' })
  @ApiResponse({ status: 200, description: 'Flat list retrieved successfully' })
  flatList(@Req() req) {
    const user = req.user;
    return this.productService.flatList(user);
  }

  @Roles(Role.admin, Role.manager)
  @Get('stats')
  @ApiOperation({ summary: 'Get products statistics', description: 'Get statistical information about products' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  stats(@Req() req) {
    const user = req.user;
    return this.productService.stats(user);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search products', description: 'Search products by name' })
  @ApiQuery({ name: 'name', type: 'string', required: true, description: 'Product name to search for' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  search(@Query('name') name: string, @Req() req) {
    const user = req.user;
    return this.productService.search(name, user);
  }

  @Get('category/:categoryId')
  @ApiOperation({ summary: 'Get products by category', description: 'Retrieve all products in a specific category' })
  @ApiParam({ name: 'categoryId', type: 'string', description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  findByCategory(@Param('categoryId') categoryId: string, @Req() req) {
    const user = req.user;
    return this.productService.findByCategory(categoryId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID', description: 'Retrieve a single product by its UUID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(@Param('id') id: string, @Req() req) {
    const user = req.user;
    return this.productService.findOne(id, user);
  }

  @Roles(Role.admin, Role.manager)
  @Patch(':id')
  @ApiOperation({ summary: 'Update product', description: 'Update product information. Only admin and manager can perform this action.' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @Req() req) {
    const user = req.user;
    return this.productService.update(id, dto, user);
  }

  @Roles(Role.admin)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete product', description: 'Delete a product. Only admin can perform this action.' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  remove(@Param('id') id: string, @Req() req) {
    const user = req.user;
    return this.productService.remove(id, user);
  }

  @Roles(Role.admin)
  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore deleted product', description: 'Restore a previously deleted product. Only admin can perform this action.' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product restored successfully' })
  restore(@Param('id') id: string, @Req() req) {
    const user = req.user;
    return this.productService.restore(id, user);
  }

  // ------------------- VARIANTS -------------------

  @Roles(Role.admin, Role.manager)
  @Post(':id/variants')
  @ApiOperation({ summary: 'Add product variants', description: 'Add one or more variants to a product' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product UUID' })
  @ApiResponse({ status: 201, description: 'Variants added successfully' })
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
  @ApiOperation({ summary: 'Get product variants', description: 'Retrieve all variants for a specific product' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Variants retrieved successfully' })
  getVariants(@Param('id') productId: string, @Req() req) {
    const user = req.user;
    return this.productService.getVariants(productId, user);
  }

  @Roles(Role.admin, Role.manager)
  @Patch('variants/:variantId')
  @ApiOperation({ summary: 'Update product variant', description: 'Update a specific product variant' })
  @ApiParam({ name: 'variantId', type: 'string', description: 'Variant UUID' })
  @ApiResponse({ status: 200, description: 'Variant updated successfully' })
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
  @ApiOperation({ summary: 'Delete product variant', description: 'Delete a specific product variant' })
  @ApiParam({ name: 'variantId', type: 'string', description: 'Variant UUID' })
  @ApiResponse({ status: 200, description: 'Variant deleted successfully' })
  deleteVariant(@Param('variantId') variantId: string, @Req() req) {
    const user = req.user;
    return this.productService.deleteVariant(variantId, user);
  }

  // ------------------- ATTRIBUTE VALUES -------------------

  @Roles(Role.admin, Role.manager)
  @Post(':id/attributes')
  @ApiOperation({ summary: 'Add product attribute value', description: 'Add an attribute value to a product' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product UUID' })
  @ApiResponse({ status: 201, description: 'Attribute value added successfully' })
  addAttributeValue(
    @Param('id') productId: string,
    @Body() dto: CreateProductAttributeValueDto,
    @Req() req,
  ) {
    const user = req.user;
    return this.productService.addAttributeValue(productId, dto, user);
  }

  @Get(':id/attributes')
  @ApiOperation({ summary: 'Get product attributes', description: 'Retrieve all attributes for a specific product' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Attributes retrieved successfully' })
  getAttributes(@Param('id') productId: string, @Req() req) {
    const user = req.user;
    return this.productService.getAttributes(productId, user);
  }

  @Roles(Role.admin, Role.manager)
  @Post('attributes/new')
  @ApiOperation({ summary: 'Create new product attribute', description: 'Create a new product attribute' })
  @ApiResponse({ status: 201, description: 'Attribute created successfully' })
  addAttribute(@Body() dto: CreateProductAttributeDto, @Req() req) {
    const user = req.user;
    return this.productService.addAttribute(dto, user);
  }

  @Get('attributes/:categoryId')
  @ApiOperation({ summary: 'Get category attributes', description: 'Retrieve all attributes for a specific category' })
  @ApiParam({ name: 'categoryId', type: 'string', description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Attributes retrieved successfully' })
  getAllAttributes(@Param('categoryId') categoryId: string, @Req() req) {
    const user = req.user;
    return this.productService.getAttributesByCategory(categoryId, user);
  }

  // ------------------- VARIANT <-> ATTRIBUTE VALUES -------------------

  @Roles(Role.admin, Role.manager)
  @Post('variants/:variantId/values')
  @ApiOperation({ summary: 'Link attribute values to variant', description: 'Link attribute values to a product variant' })
  @ApiParam({ name: 'variantId', type: 'string', description: 'Variant UUID' })
  @ApiResponse({ status: 200, description: 'Attribute values linked successfully' })
  linkVariantValues(
    @Param('variantId') variantId: string,
    @Body() body: { valueIds: string[] },
    @Req() req,
  ) {
    const user = req.user;
    return this.productService.linkVariantValues(variantId, body.valueIds, user);
  }

  @Get('variants/:variantId/values')
  @ApiOperation({ summary: 'Get variant attribute values', description: 'Retrieve all attribute values linked to a variant' })
  @ApiParam({ name: 'variantId', type: 'string', description: 'Variant UUID' })
  @ApiResponse({ status: 200, description: 'Attribute values retrieved successfully' })
  getVariantValues(@Param('variantId') variantId: string, @Req() req) {
    const user = req.user;
    return this.productService.getVariantValues(variantId, user);
  }




}


