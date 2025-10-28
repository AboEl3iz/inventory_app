import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Role, Roles } from 'src/common/decorator/roles.decorator';
import { AuthenticationGuard } from 'src/common/guard/authentication.guard';
import { AuthorizationGuard } from 'src/common/guard/authorization.guard';

@Controller('branches')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post('create')
  @Roles(Role.admin)
  create(@Body() dto: CreateBranchDto, @Req() req: any) {
    return this.branchesService.create(dto, req.user.id);
  }

  @Get('get-all')
  @Roles(Role.admin)
  findAll() {
    return this.branchesService.findAll();
  }

  @Get('branch/:id')
  @Roles(Role.admin, Role.manager)
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Patch('branch/:id')
  @Roles(Role.admin)
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }

  @Delete('branch/:id')
  @Roles(Role.admin)
  remove(@Param('id') id: string) {
    return this.branchesService.remove(id);
  }

  @Get(':id/stats')
  @Roles(Role.admin, Role.manager)
  async getBranchStats(@Param('id') id: string, @Req() req) {
    return this.branchesService.getBranchStats(id, req.user);
  }

  // ✅ NEW ENDPOINTS
  @Post(':branchId/assign-manager/:userId')
  @Roles(Role.admin)
  assignManager(@Param('branchId') branchId: string, @Param('userId') userId: string) {
    return this.branchesService.assignUserToBranch(branchId, userId, Role.manager);
  }

  @Post(':branchId/assign-cashier/:userId')
  @Roles(Role.admin)
  assignCashier(@Param('branchId') branchId: string, @Param('userId') userId: string) {
    return this.branchesService.assignUserToBranch(branchId, userId, Role.cashier);
  }
}
