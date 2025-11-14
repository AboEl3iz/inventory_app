import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards, NotAcceptableException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Roles, Role } from 'src/common/decorator/roles.decorator';
import { AuthenticationGuard } from 'src/common/guard/authentication.guard';
import { AuthorizationGuard } from 'src/common/guard/authorization.guard';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@Controller('invoices')
@ApiTags('Invoices')
@ApiBearerAuth('access-token')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class InvoicesController {
  constructor(private readonly invoiceService: InvoicesService) {}

  /**
   * 🟢 Create a new invoice
   */
  @Post()
  @ApiOperation({ summary: 'Create invoice', description: 'Create a new invoice. Admin, manager, and cashier can perform this action.' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
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
  @ApiOperation({ summary: 'Get all invoices', description: 'Retrieve all invoices based on user role' })
  @ApiQuery({ name: 'branchId', type: 'string', required: false, description: 'Filter by branch UUID' })
  @ApiQuery({ name: 'status', type: 'string', required: false, description: 'Filter by invoice status' })
  @ApiQuery({ name: 'limit', type: 'number', required: false, description: 'Number of items per page (default: 20)' })
  @ApiQuery({ name: 'page', type: 'number', required: false, description: 'Page number (default: 1)' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
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
  @ApiOperation({ summary: 'Get invoice by ID', description: 'Retrieve a specific invoice' })
  @ApiParam({ name: 'id', type: 'string', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
  @Roles(Role.admin, Role.manager, Role.cashier)
  async getOne(@Param('id') id: string, @Req() req) {
    return this.invoiceService.getOne(id, req.user);
  }

  /**
   * 🔴 Cancel invoice
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Cancel invoice', description: 'Cancel an invoice. Only admin and manager can perform this action.' })
  @ApiParam({ name: 'id', type: 'string', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Invoice cancelled successfully' })
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