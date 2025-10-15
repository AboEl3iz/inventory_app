import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Role, Roles } from 'src/common/decorator/roles.decorator';
import { AuthenticationGuard } from 'src/common/guard/authentication.guard';
import { AuthorizationGuard } from 'src/common/guard/authorization.guard';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post("create")
  @Roles(Role.admin)
  @UseGuards(AuthenticationGuard,AuthorizationGuard)
  create(@Body() createBranchDto: CreateBranchDto , @Req() req : any) {
    return this.branchesService.create(createBranchDto , req.user.id);
  }

  @Get("get-all")
  @Roles(Role.admin)
  @UseGuards(AuthenticationGuard,AuthorizationGuard)
  findAll() {
    return this.branchesService.findAll();
  }

  @Get('branch/:id')
  @Roles(Role.admin, Role.manager)
  @UseGuards(AuthenticationGuard,AuthorizationGuard)
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Patch('branch/:id')
  @Roles(Role.admin)
  @UseGuards(AuthenticationGuard,AuthorizationGuard)
  update(@Param('id') id: string, @Body() updateBranchDto: UpdateBranchDto) {
    return this.branchesService.update(id, updateBranchDto);
  }

  @Delete('branch/:id')
  @Roles(Role.admin)
  @UseGuards(AuthenticationGuard,AuthorizationGuard)
  remove(@Param('id') id: string) {
    return this.branchesService.remove(id);
  }

  @Get(':id/stats')
  @Roles(Role.admin, Role.manager)
  @UseGuards(AuthenticationGuard,AuthorizationGuard)
  async getBranchStats(@Param('id') id: string , @Req() req ) {
    return this.branchesService.getBranchStats(id , req.user.id);
  }
}
