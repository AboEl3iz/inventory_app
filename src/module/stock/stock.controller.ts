import { Controller, Get, Param, Query, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { StockService } from './stock.service';
import { AuthenticationGuard } from 'src/common/guard/authentication.guard';
import { AuthorizationGuard } from 'src/common/guard/authorization.guard';
import { Roles, Role } from 'src/common/decorator/roles.decorator';
import {
  ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBearerAuth,
} from '@nestjs/swagger';

@Controller('stock')
@ApiTags('Stock')
@ApiBearerAuth('access-token')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class StockController {
  constructor(private readonly stockService: StockService) { }

  @Get('movements')
  @ApiOperation({ summary: 'Get stock movements', description: 'Retrieve paginated stock movements with optional filters' })
  @ApiQuery({ name: 'page', type: 'number', required: false })
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiQuery({ name: 'type', type: 'string', required: false, description: 'Filter by type: sale, purchase, adjustment, return, transfer, damage' })
  @ApiQuery({ name: 'branchId', type: 'string', required: false })
  @ApiResponse({ status: 200, description: 'Stock movements retrieved successfully' })
  findAll(
    @Req() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.stockService.findAll(req.user, page, limit, type, branchId);
  }

  @Get('summary')
  @Roles(Role.admin, Role.manager)
  @ApiOperation({ summary: 'Get stock movement summary', description: 'Aggregated stock movement stats' })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  getSummary(@Req() req) {
    return this.stockService.getSummary(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stock movement by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Stock movement UUID' })
  @ApiResponse({ status: 200, description: 'Stock movement retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Stock movement not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.stockService.findOne(id);
  }
}
