import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@Controller('stock')
@ApiTags('Stock')
@ApiBearerAuth('access-token')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  @ApiOperation({ summary: 'Create stock', description: 'Create a new stock record' })
  @ApiResponse({ status: 201, description: 'Stock created successfully' })
  create(@Body() createStockDto: CreateStockDto) {
    return this.stockService.create(createStockDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stock records', description: 'Retrieve all stock records' })
  @ApiResponse({ status: 200, description: 'Stock records retrieved successfully' })
  findAll() {
    return this.stockService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stock by ID', description: 'Retrieve a specific stock record' })
  @ApiParam({ name: 'id', type: 'number', description: 'Stock ID' })
  @ApiResponse({ status: 200, description: 'Stock retrieved successfully' })
  findOne(@Param('id') id: string) {
    return this.stockService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update stock', description: 'Update stock information' })
  @ApiParam({ name: 'id', type: 'number', description: 'Stock ID' })
  @ApiResponse({ status: 200, description: 'Stock updated successfully' })
  update(@Param('id') id: string, @Body() updateStockDto: UpdateStockDto) {
    return this.stockService.update(+id, updateStockDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete stock', description: 'Delete a stock record' })
  @ApiParam({ name: 'id', type: 'number', description: 'Stock ID' })
  @ApiResponse({ status: 200, description: 'Stock deleted successfully' })
  remove(@Param('id') id: string) {
    return this.stockService.remove(+id);
  }
}
