import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Role, Roles } from 'src/common/decorator/roles.decorator';
import { AuthenticationGuard } from 'src/common/guard/authentication.guard';
import { AuthorizationGuard } from 'src/common/guard/authorization.guard';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@Controller('suppliers')
@ApiTags('Suppliers')
@ApiBearerAuth('access-token')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) { }

  @Post("add-new")
  @ApiOperation({ summary: 'Create supplier', description: 'Create a new supplier. Only admin and manager can perform this action.' })
  @ApiResponse({ status: 201, description: 'Supplier created successfully' })
  @Roles(Role.admin, Role.manager)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(createSupplierDto);
  }

  @Get("get-all")
  @ApiOperation({ summary: 'Get all suppliers', description: 'Retrieve all suppliers. Only admin can perform this action.' })
  @ApiResponse({ status: 200, description: 'Suppliers retrieved successfully' })
  @Roles(Role.admin)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  findAll() {
    return this.suppliersService.findAll();
  }

  @Get('refill-recommendations')
  @ApiOperation({ summary: 'Get refill recommendations', description: 'Get product refill recommendations from suppliers' })
  @ApiResponse({ status: 200, description: 'Recommendations retrieved successfully' })
  async getRefillRecommendations() {
    return this.suppliersService.getRefillRecommendations();
  }

  @Get('info/:id')
  @ApiOperation({ summary: 'Get supplier by ID', description: 'Retrieve a specific supplier information' })
  @ApiParam({ name: 'id', type: 'string', description: 'Supplier UUID' })
  @ApiResponse({ status: 200, description: 'Supplier retrieved successfully' })
  @Roles(Role.admin, Role.manager)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update supplier', description: 'Update supplier information' })
  @ApiParam({ name: 'id', type: 'string', description: 'Supplier UUID' })
  @ApiResponse({ status: 200, description: 'Supplier updated successfully' })
  @Roles(Role.admin, Role.manager)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  update(@Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto) {
    return this.suppliersService.update(id, updateSupplierDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete supplier', description: 'Delete a supplier. Only admin can perform this action.' })
  @ApiParam({ name: 'id', type: 'string', description: 'Supplier UUID' })
  @ApiResponse({ status: 200, description: 'Supplier deleted successfully' })
  @Roles(Role.admin)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}
