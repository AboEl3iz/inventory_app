import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Logger } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthenticationGuard } from 'src/common/guard/authentication.guard';
import { Roles, Role } from 'src/common/decorator/roles.decorator';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthorizationGuard } from 'src/common/guard/authorization.guard';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@Controller('users')
@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards()
export class UsersController {
  private readonly logger = new Logger('UsersController');
  constructor(private readonly usersService: UsersService) {
    
  }
  
  @Post('register')
  @ApiOperation({ summary: 'Register new user', description: 'Create a new user account. Only admin and manager can perform this action.' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid user data' })
  @Roles(Role.admin , Role.manager)
  @UseGuards(AuthenticationGuard , AuthorizationGuard)
  register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get('login')
  @ApiOperation({ summary: 'User login', description: 'Authenticate user and get JWT token' })
  @ApiResponse({ status: 200, description: 'Login successful, JWT token returned' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() LoginUserDto: LoginUserDto) {
    return this.usersService.login(LoginUserDto);
  }

  @Get('refreshtoken/:refreshtoken')
  @ApiOperation({ summary: 'Refresh authentication token', description: 'Get a new JWT token using refresh token' })
  @ApiParam({ name: 'refreshtoken', description: 'Refresh token' })
  @ApiResponse({ status: 200, description: 'New token generated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  findOne(@Param('refreshtoken') refreshtoken: string) {
    return this.usersService.refreshtoken(refreshtoken);
  }

  @Patch('role/:id')
  @ApiOperation({ summary: 'Update user role', description: 'Update the role of a user. Only admin can perform this action.' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Roles(Role.admin)
  @UseGuards(AuthenticationGuard,AuthorizationGuard)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateRole(id, updateUserDto);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile', description: 'Update the current user profile information' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @UseGuards(AuthenticationGuard)
  updateinfo(@Req() req: any, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateProfile(req.user.id, updateUserDto);
  }

  @Delete('delete/:id')
  @ApiOperation({ summary: 'Delete user', description: 'Delete a user account. Only admin can perform this action.' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Roles(Role.admin)
  @UseGuards(AuthenticationGuard,AuthorizationGuard)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
