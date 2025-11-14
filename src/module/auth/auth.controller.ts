import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@Controller('auth')
@ApiTags('Authentication')
@ApiBearerAuth('access-token')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  @ApiOperation({ summary: 'Create authentication record', description: 'Create a new authentication record' })
  @ApiResponse({ status: 201, description: 'Authentication record created successfully' })
  create(@Body() createAuthDto: CreateAuthDto) {
     this.authService.create(createAuthDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all authentication records', description: 'Retrieve all authentication records' })
  @ApiResponse({ status: 200, description: 'Authentication records retrieved successfully' })
  findAll() {
    return this.authService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get authentication record by ID', description: 'Retrieve a specific authentication record' })
  @ApiParam({ name: 'id', type: 'number', description: 'Authentication record ID' })
  @ApiResponse({ status: 200, description: 'Authentication record retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Authentication record not found' })
  findOne(@Param('id') id: string) {
    return this.authService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update authentication record', description: 'Update an authentication record' })
  @ApiParam({ name: 'id', type: 'number', description: 'Authentication record ID' })
  @ApiResponse({ status: 200, description: 'Authentication record updated successfully' })
  update(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
    return this.authService.update(+id, updateAuthDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete authentication record', description: 'Delete an authentication record' })
  @ApiParam({ name: 'id', type: 'number', description: 'Authentication record ID' })
  @ApiResponse({ status: 200, description: 'Authentication record deleted successfully' })
  remove(@Param('id') id: string) {
    return this.authService.remove(+id);
  }
}
