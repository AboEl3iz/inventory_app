import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Role, Roles } from 'src/common/decorator/roles.decorator';
import { AuthenticationGuard } from 'src/common/guard/authentication.guard';
import { AuthorizationGuard } from 'src/common/guard/authorization.guard';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@Controller('branches')
@ApiTags('Branches')
@ApiBearerAuth('access-token')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post('create')
  @ApiOperation({
    summary: 'Create branch',
    description: 'Create a new branch. Only admin can perform this action.',
  })
  @ApiResponse({ status: 201, description: 'Branch created successfully' })
  @Roles(Role.admin)
  create(@Body() dto: CreateBranchDto, @Req() req: any) {
    return this.branchesService.create(dto, req.user.id);
  }

  @Get('get-all')
  @ApiOperation({
    summary: 'Get all branches',
    description: 'Retrieve all branches. Only admin can perform this action.',
  })
  @ApiResponse({ status: 200, description: 'Branches retrieved successfully' })
  @Roles(Role.admin)
  findAll() {
    return this.branchesService.findAll();
  }

  @Get('branch/:id')
  @ApiOperation({
    summary: 'Get branch by ID',
    description:
      'Retrieve a specific branch. Only admin and manager can perform this action.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Branch UUID' })
  @ApiResponse({ status: 200, description: 'Branch retrieved successfully' })
  @Roles(Role.admin, Role.manager)
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Patch('branch/:id')
  @ApiOperation({
    summary: 'Update branch',
    description:
      'Update branch information. Only admin can perform this action.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Branch UUID' })
  @ApiResponse({ status: 200, description: 'Branch updated successfully' })
  @Roles(Role.admin)
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }

  @Delete('branch/:id')
  @ApiOperation({
    summary: 'Delete branch',
    description: 'Delete a branch. Only admin can perform this action.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Branch UUID' })
  @ApiResponse({ status: 200, description: 'Branch deleted successfully' })
  @Roles(Role.admin)
  remove(@Param('id') id: string) {
    return this.branchesService.remove(id);
  }

  @Get(':id/stats')
  @ApiOperation({
    summary: 'Get branch statistics',
    description: 'Get statistical information about a branch',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Branch UUID' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @Roles(Role.admin, Role.manager)
  async getBranchStats(@Param('id') id: string, @Req() req) {
    return this.branchesService.getBranchStats(id, req.user);
  }

  // ✅ NEW ENDPOINTS
  @Post(':branchId/assign-manager/:userId')
  @ApiOperation({
    summary: 'Assign manager to branch',
    description: 'Assign a user as manager to a branch',
  })
  @ApiParam({ name: 'branchId', type: 'string', description: 'Branch UUID' })
  @ApiParam({ name: 'userId', type: 'string', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Manager assigned successfully' })
  @Roles(Role.admin)
  assignManager(
    @Param('branchId') branchId: string,
    @Param('userId') userId: string,
  ) {
    return this.branchesService.assignUserToBranch(
      branchId,
      userId,
      Role.manager,
    );
  }

  @Post(':branchId/assign-cashier/:userId')
  @ApiOperation({
    summary: 'Assign cashier to branch',
    description: 'Assign a user as cashier to a branch',
  })
  @ApiParam({ name: 'branchId', type: 'string', description: 'Branch UUID' })
  @ApiParam({ name: 'userId', type: 'string', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Cashier assigned successfully' })
  @Roles(Role.admin)
  assignCashier(
    @Param('branchId') branchId: string,
    @Param('userId') userId: string,
  ) {
    return this.branchesService.assignUserToBranch(
      branchId,
      userId,
      Role.cashier,
    );
  }
}
