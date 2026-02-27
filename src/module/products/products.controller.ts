import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
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
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

@Controller('products')
@ApiTags('Products')
@ApiBearerAuth('access-token')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class ProductsController {
  constructor(private readonly productService: ProductsService) {}

  // ─── BASIC CRUD ───

  @Roles(Role.admin, Role.manager)
  @Post()
  @ApiOperation({
    summary: 'Create a new product',
    description:
      'Create a new product. Only admin and manager can perform this action.',
  })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid product data' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  create(@Body() dto: CreateProductDto, @Req() req) {
    return this.productService.create(dto, req.user);
  }

  @Roles(Role.admin, Role.manager)
  @Post(':productId/images')
  @ApiOperation({
    summary: 'Upload product images',
    description: 'Upload up to 5 product images',
  })
  @ApiParam({ name: 'productId', description: 'Product ID (UUID)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description:
            'Product images (JPEG, PNG, JPG, WEBP — max 5 files, 5MB each)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Images uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file format or size' })
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      storage: diskStorage({
        destination: 'uploads/products',
        filename: (_req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(
            null,
            `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`,
          );
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|jpg|webp)$/)) {
          return cb(
            new BadRequestException(
              'Only image files (jpeg, jpg, png, webp) are allowed!',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Req() req,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No images uploaded');
    }
    return this.productService.uploadProductImages(
      productId,
      files.map((file) => file.path),
      req.user,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all products',
    description: 'Retrieve all products with optional pagination and filtering',
  })
  @ApiQuery({
    name: 'page',
    type: 'number',
    required: false,
    description: 'Page number (starts from 1)',
  })
  @ApiQuery({
    name: 'limit',
    type: 'number',
    required: false,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'search',
    type: 'string',
    required: false,
    description: 'Search by product name',
  })
  @ApiQuery({
    name: 'categoryId',
    type: 'string',
    required: false,
    description: 'Filter by category UUID',
  })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Req() req?,
  ) {
    return this.productService.findAll(
      page,
      limit,
      search,
      categoryId,
      req.user,
    );
  }

  @Get('flat')
  @ApiOperation({
    summary: 'Get flat products list',
    description: 'Simplified list without pagination',
  })
  @ApiResponse({ status: 200, description: 'Flat list retrieved successfully' })
  flatList(@Req() req) {
    return this.productService.flatList(req.user);
  }

  @Roles(Role.admin, Role.manager)
  @Get('stats')
  @ApiOperation({ summary: 'Get products statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  stats(@Req() req) {
    return this.productService.stats(req.user);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search products',
    description: 'Search products by name',
  })
  @ApiQuery({ name: 'name', type: 'string', required: true })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  search(@Query('name') name: string, @Req() req) {
    return this.productService.search(name, req.user);
  }

  @Get('category/:categoryId')
  @ApiOperation({ summary: 'Get products by category' })
  @ApiParam({
    name: 'categoryId',
    type: 'string',
    description: 'Category UUID',
  })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  findByCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Req() req,
  ) {
    return this.productService.findByCategory(categoryId, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.findOne(id);
  }

  @Roles(Role.admin, Role.manager)
  @Patch(':id')
  @ApiOperation({ summary: 'Update product' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @Req() req,
  ) {
    return this.productService.update(id, dto, req.user);
  }

  @Roles(Role.admin)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete product' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.remove(id);
  }

  @Roles(Role.admin)
  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore deleted product' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product restored successfully' })
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.restore(id);
  }

  // ─── VARIANTS ───

  @Roles(Role.admin, Role.manager)
  @Post(':id/variants')
  @ApiOperation({ summary: 'Add product variants' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product UUID' })
  @ApiResponse({ status: 201, description: 'Variants added successfully' })
  addVariants(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: CreateVariantDto[] | CreateVariantDto,
  ) {
    return this.productService.addVariants(
      productId,
      Array.isArray(dto) ? dto : [dto],
    );
  }

  @Get(':id/variants')
  @ApiOperation({ summary: 'Get product variants' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Variants retrieved successfully' })
  getVariants(@Param('id', ParseUUIDPipe) productId: string) {
    return this.productService.getVariants(productId);
  }

  @Roles(Role.admin, Role.manager)
  @Patch('variants/:variantId')
  @ApiOperation({ summary: 'Update product variant' })
  @ApiParam({ name: 'variantId', type: 'string', description: 'Variant UUID' })
  @ApiResponse({ status: 200, description: 'Variant updated successfully' })
  updateVariant(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.productService.updateVariant(variantId, dto);
  }

  @Roles(Role.admin)
  @Delete('variants/:variantId')
  @ApiOperation({ summary: 'Delete product variant' })
  @ApiParam({ name: 'variantId', type: 'string', description: 'Variant UUID' })
  @ApiResponse({ status: 200, description: 'Variant deleted successfully' })
  deleteVariant(@Param('variantId', ParseUUIDPipe) variantId: string) {
    return this.productService.deleteVariant(variantId);
  }

  // ─── ATTRIBUTES ───

  @Roles(Role.admin, Role.manager)
  @Post(':id/attributes')
  @ApiOperation({ summary: 'Add product attribute value' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product UUID' })
  @ApiResponse({
    status: 201,
    description: 'Attribute value added successfully',
  })
  addAttributeValue(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: CreateProductAttributeValueDto,
  ) {
    return this.productService.addAttributeValue(productId, dto);
  }

  @Get(':id/attributes')
  @ApiOperation({ summary: 'Get product attributes' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product UUID' })
  @ApiResponse({
    status: 200,
    description: 'Attributes retrieved successfully',
  })
  getAttributes(@Param('id', ParseUUIDPipe) productId: string) {
    return this.productService.getAttributes(productId);
  }

  @Roles(Role.admin, Role.manager)
  @Post('attributes/new')
  @ApiOperation({ summary: 'Create new product attribute' })
  @ApiResponse({ status: 201, description: 'Attribute created successfully' })
  addAttribute(@Body() dto: CreateProductAttributeDto) {
    return this.productService.addAttribute(dto);
  }

  @Get('attributes/:categoryId')
  @ApiOperation({ summary: 'Get category attributes' })
  @ApiParam({
    name: 'categoryId',
    type: 'string',
    description: 'Category UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Attributes retrieved successfully',
  })
  getAllAttributes(@Param('categoryId', ParseUUIDPipe) categoryId: string) {
    return this.productService.getAttributesByCategory(categoryId);
  }

  // ─── VARIANT ↔ ATTRIBUTE VALUES ───

  @Roles(Role.admin, Role.manager)
  @Post('variants/:variantId/values')
  @ApiOperation({ summary: 'Link attribute values to variant' })
  @ApiParam({ name: 'variantId', type: 'string', description: 'Variant UUID' })
  @ApiResponse({
    status: 200,
    description: 'Attribute values linked successfully',
  })
  linkVariantValues(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() body: { valueIds: string[] },
  ) {
    return this.productService.linkVariantValues(variantId, body.valueIds);
  }

  @Get('variants/:variantId/values')
  @ApiOperation({ summary: 'Get variant attribute values' })
  @ApiParam({ name: 'variantId', type: 'string', description: 'Variant UUID' })
  @ApiResponse({
    status: 200,
    description: 'Attribute values retrieved successfully',
  })
  getVariantValues(@Param('variantId', ParseUUIDPipe) variantId: string) {
    return this.productService.getVariantValues(variantId);
  }
}
