import { BadRequestException, ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';
import { v4 as uuidv4 } from 'uuid';
import { comparePassword, encryptPassword } from 'src/shared/encryption';
import { IregisterResponse } from 'src/shared/interfaces/register-response';
import { IloginResponse } from 'src/shared/interfaces/login.response';
import { Auth } from '../auth/entities/auth.entity';
import { LoginUserDto } from './dto/login-user.dto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';
import { Role } from 'src/common/decorator/roles.decorator';
@Injectable()
export class UsersService {
  constructor(@InjectRepository(User)
  private usersRepository: Repository<User>,
    @InjectRepository(Auth)
    private authRepository: Repository<Auth>,
    private configService: ConfigService,
    private readonly jwtService: JwtService,
    private authService: AuthService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,

  ) { }
  async create(createUserDto: CreateUserDto): Promise<IregisterResponse> {
    if (await this.usersRepository.findOne({ where: { email: createUserDto.email } })) {
      throw new BadRequestException('Email already exists');
    }
    const hashedPassword = await encryptPassword(createUserDto.password, 10);
    const user = await this.usersRepository.create({
      ...createUserDto, password: hashedPassword
    });
    user.role = Role.cashier; 
    await this.usersRepository.save(user);
    const accesstoken = await this.generateToken(user);
    const refreshtoken = this.generateRefreshToken();
    await this.authService.create({
      user, refreshToken: refreshtoken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      accesstoken,
      refreshtoken
    };
  }

  async login(LoginUserDto: LoginUserDto): Promise<IloginResponse> {
    let user = await this.usersRepository.findOne({
      where: { email: LoginUserDto.email },
      relations: ['purchases', 'invoices', 'branch']
    });
    if (!user) {
      throw new BadRequestException('Invalid email or password');
    }
    const isPasswordValid = await comparePassword(LoginUserDto.password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid email or password');
    }
    const { accesstoken, refreshtoken, oldRefreshToken } = await this.generateTokens(user!);
    if (oldRefreshToken && oldRefreshToken.expiresAt < new Date()) {
      await this.authRepository.remove(oldRefreshToken!);
      await this.authService.create({ user: user!, refreshToken: refreshtoken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    }

    return {
      id: user!.id,
      name: user!.name,
      email: user!.email,
      role: user!.role,
      branchId: user!.branch?.id ?? '',
      purchases: user!.purchases,
      invoivses: user!.invoices,
      accesstoken,
      refreshtoken
    };
  }

  async refreshtoken(refreshtoken: string): Promise<IloginResponse> {
    const oldToken = await this.authRepository.findOne({ where: { refreshToken: refreshtoken }, relations: ['user'] });
    if (!oldToken) {
      throw new BadRequestException('Invalid refresh token');
    }
    if (oldToken.expiresAt < new Date()) {
      await this.authRepository.remove(oldToken);
      throw new BadRequestException('Refresh token expired');
    }
    const tokens = await this.generateTokens(oldToken.user);
    await this.authRepository.remove(oldToken!);
    await this.authService.create({ user: oldToken.user!, refreshToken: tokens.refreshtoken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });

    let user: IloginResponse = {
      id: oldToken.user.id,
      name: oldToken.user.name,
      email: oldToken.user.email,
      role: oldToken.user.role,
      branchId: oldToken.user.branch?.id ?? '',
      purchases: oldToken.user.purchases,
      invoivses: oldToken.user.invoices,
      accesstoken: tokens.accesstoken,
      refreshtoken: tokens.refreshtoken
    };

    return user;
  }

  async updateRole(id: string, updateUserDto: UpdateUserDto): Promise<String> {
    const user = await this.usersRepository.findOne({ where: { id } });
    this.logger.debug(`Updating user with ID: ${id}`);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const updatedUser = { ...user, ...updateUserDto };
    await this.usersRepository.update(id, updatedUser);
    return 'User updated successfully';
  }

  async updateProfile(id: string, updateUserDto: UpdateUserDto): Promise<String> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      this.logger.warn(`User with id ${id} not found`);
      throw new BadRequestException('User not found');
    }
    if (updateUserDto.role) {
      this.logger.warn(`Attempt to change role by user ${id}`);
      throw new ForbiddenException('You cannot update role');
    }
    if (updateUserDto.password) {
      updateUserDto.password = await encryptPassword(updateUserDto.password, 10);
    }

    const updatedUser = { ...user, ...updateUserDto };
    await this.usersRepository.update(id, updatedUser);
    return 'User updated successfully';
  }

  async remove(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }


  private async generateToken(user: User) {
    const payload = { id: user.id, email: user.email, role: user.role , branchId: user.branch?.id ?? ''};
    const token = await this.jwtService.sign(payload);
    return token;
  }
  private generateRefreshToken() {
    return uuidv4();
  }

   async generateTokens(user: User) {
    const accesstoken = await this.generateToken(user!);
    const refreshtoken = this.generateRefreshToken();
    let oldRefreshToken = await this.authRepository.findOne({ where: { user: { id: user.id } } });


    return { accesstoken, refreshtoken, oldRefreshToken };
  }
}
