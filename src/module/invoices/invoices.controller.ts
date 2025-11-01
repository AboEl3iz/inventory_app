import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards, NotAcceptableException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Roles, Role } from 'src/common/decorator/roles.decorator';
import { AuthenticationGuard } from 'src/common/guard/authentication.guard';
import { AuthorizationGuard } from 'src/common/guard/authorization.guard';

@Controller('invoices')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class InvoicesController {
  constructor(private readonly invoiceService: InvoicesService) {}

  /**
   * 🟢 Create a new invoice
   */
  @Post()
  @Roles(Role.admin, Role.manager, Role.cashier)
  create(@Body() dto: CreateInvoiceDto, @Req() req) {
    console.log('User from JWT:', req.user);
    if(req.user.role === Role.admin){
      throw new NotAcceptableException('Admins are not allowed to create invoices.');
    }

    // user ID and branch come from JWT, not request body
    return this.invoiceService.createInvoice({
      ...dto,
      userId: req.user.id,
      branchId: req.user.branchId,
    });
  }

  /**
   * 🟢 Get all invoices (filtered by role)
   */
  @Get()
  @Roles(Role.admin, Role.manager, Role.cashier)
  async getAll(
    @Req() req,
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('limit') limit = 20,
    @Query('page') page = 1,
  ) {
    return this.invoiceService.getAll(req.user, branchId, status, limit, page);
  }

  /**
   * 🟢 Get one invoice
   */
  @Get(':id')
  @Roles(Role.admin, Role.manager, Role.cashier)
  async getOne(@Param('id') id: string, @Req() req) {
    return this.invoiceService.getOne(id, req.user);
  }

  /**
   * 🔴 Cancel invoice
   */
  @Delete(':id')
  @Roles(Role.admin, Role.manager)
  async cancelInvoice(@Param('id') id: string, @Req() req) {
    return this.invoiceService.cancelInvoice(id, req.user);
  }

  /**
   * 📊 Get revenue stats for branch
   */
  @Get('branch/:branchId/stats')
  @Roles(Role.admin, Role.manager)
  async getBranchStats(@Param('branchId') branchId: string, @Req() req) {
    return this.invoiceService.getBranchStats(branchId, req.user);
  }
}