import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@Controller('categories')
@ApiTags('Categories')
@ApiBearerAuth('access-token')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create category',
    description: 'Create a new product category',
  })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all categories',
    description: 'Retrieve all product categories',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get('flat')
  @ApiOperation({
    summary: 'Get flat categories list',
    description: 'Get a simplified list of all categories without hierarchy',
  })
  @ApiResponse({ status: 200, description: 'Flat list retrieved successfully' })
  findFlat() {
    return this.categoriesService.findFlat();
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get categories statistics',
    description: 'Get statistical information about categories',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  stats() {
    return this.categoriesService.stats();
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search categories',
    description: 'Search categories by name',
  })
  @ApiQuery({
    name: 'name',
    type: 'string',
    required: true,
    description: 'Category name to search for',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  search(@Query('name') name: string) {
    return this.categoriesService.search(name);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get category by ID',
    description: 'Retrieve a specific category',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update category',
    description: 'Update category information',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete category',
    description: 'Delete a category',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }

  @Patch(':id/restore')
  @ApiOperation({
    summary: 'Restore deleted category',
    description: 'Restore a previously deleted category',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Category restored successfully' })
  restore(@Param('id') id: string) {
    return this.categoriesService.restore(id);
  }
}
