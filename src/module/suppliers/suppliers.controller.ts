import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Role, Roles } from 'src/common/decorator/roles.decorator';
import { AuthenticationGuard } from 'src/common/guard/authentication.guard';
import { AuthorizationGuard } from 'src/common/guard/authorization.guard';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) { }

  @Post("add-new")
  @Roles(Role.admin, Role.manager)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(createSupplierDto);
  }

  @Get("get-all")
  @Roles(Role.admin)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  findAll() {
    return this.suppliersService.findAll();
  }
  @Get('refill-recommendations')
  async getRefillRecommendations() {
    return this.suppliersService.getRefillRecommendations();
  }


  @Get('info/:id')
  @Roles(Role.admin, Role.manager)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.admin, Role.manager)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  update(@Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto) {
    return this.suppliersService.update(id, updateSupplierDto);
  }

  @Delete(':id')
  @Roles(Role.admin)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}
