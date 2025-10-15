import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Logger } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthenticationGuard } from 'src/common/guard/authentication.guard';
import { Roles ,Role } from 'src/common/decorator/roles.decorator';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthorizationGuard } from 'src/common/guard/authorization.guard';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger('UsersController');
  constructor(private readonly usersService: UsersService) {
    
  }
  
  @Post('register')
  @Roles(Role.admin , Role.manager)
  @UseGuards(AuthenticationGuard , AuthorizationGuard)
  register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get('login')
  login(@Body() LoginUserDto: LoginUserDto) {
    return this.usersService.login(LoginUserDto);
  }

  @Get('refreshtoken/:refreshtoken')
  findOne(@Param('refreshtoken') refreshtoken: string) {
    return this.usersService.refreshtoken(refreshtoken);
  }

  @Patch('role/:id')
  @Roles(Role.admin)
  @UseGuards(AuthenticationGuard,AuthorizationGuard)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateRole(id, updateUserDto);
  }

  @Patch('profile')
  @UseGuards(AuthenticationGuard)
  updateinfo(@Req() req: any, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateProfile(req.user.id, updateUserDto);
  }

  @Delete('delete/:id')
  @Roles(Role.admin)
  @UseGuards(AuthenticationGuard,AuthorizationGuard)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
