import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthenticationGuard } from 'src/common/guard/authentication.guard';
import { Roles ,Role } from 'src/common/decorator/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  /**
   * let the admin register manager and cashier
   * @param createUserDto 
   * @returns 
   */
  @Post('register')
  // @Roles(Role.admin , Role.manager)
  // @UseGuards(AuthenticationGuard)
  register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get('login')
  @UseGuards(AuthenticationGuard)
  login(@Req() req: any) {
    return this.usersService.login(req.user.id);
  }

  @Get('refreshtoken/:refreshtoken')
  findOne(@Param('refreshtoken') refreshtoken: string) {
    return this.usersService.refreshtoken(refreshtoken);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
