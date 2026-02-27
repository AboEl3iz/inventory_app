import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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

/** Refresh token validity duration: 7 days */
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<IregisterResponse> {
    const existingUser = await this.usersRepository.findOne({ where: { email: createUserDto.email } });
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS') || 10;
    const hashedPassword = await encryptPassword(createUserDto.password, saltRounds);

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      role: Role.cashier,
    });
    await this.usersRepository.save(user);

    const accesstoken = await this.generateAccessToken(user);
    const refreshtoken = this.generateRefreshToken();

    await this.authService.create({
      user,
      refreshToken: refreshtoken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      accesstoken,
      refreshtoken,
    };
  }

  async login(loginUserDto: LoginUserDto): Promise<IloginResponse> {
    const user = await this.usersRepository.findOne({
      where: { email: loginUserDto.email },
      relations: ['purchases', 'invoices', 'branch'],
    });

    if (!user) {
      throw new BadRequestException('Invalid email or password');
    }

    const isPasswordValid = await comparePassword(loginUserDto.password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid email or password');
    }

    // Always rotate refresh token on login
    const accesstoken = await this.generateAccessToken(user);
    const refreshtoken = this.generateRefreshToken();

    // Remove old refresh token if it exists
    const oldRefreshToken = await this.authRepository.findOne({ where: { user: { id: user.id } } });
    if (oldRefreshToken) {
      await this.authRepository.remove(oldRefreshToken);
    }

    // Save new refresh token
    await this.authService.create({
      user,
      refreshToken: refreshtoken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branch?.id ?? '',
      purchases: user.purchases,
      invoices: user.invoices,
      accesstoken,
      refreshtoken,
    };
  }

  async refreshtoken(refreshtoken: string): Promise<IloginResponse> {
    const oldToken = await this.authRepository.findOne({
      where: { refreshToken: refreshtoken },
      relations: ['user', 'user.branch', 'user.purchases', 'user.invoices'],
    });

    if (!oldToken) {
      throw new BadRequestException('Invalid refresh token');
    }

    if (oldToken.expiresAt < new Date()) {
      await this.authRepository.remove(oldToken);
      throw new BadRequestException('Refresh token expired');
    }

    // Rotate tokens
    const newAccessToken = await this.generateAccessToken(oldToken.user);
    const newRefreshToken = this.generateRefreshToken();

    await this.authRepository.remove(oldToken);
    await this.authService.create({
      user: oldToken.user,
      refreshToken: newRefreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });

    return {
      id: oldToken.user.id,
      name: oldToken.user.name,
      email: oldToken.user.email,
      role: oldToken.user.role,
      branchId: oldToken.user.branch?.id ?? '',
      purchases: oldToken.user.purchases,
      invoices: oldToken.user.invoices,
      accesstoken: newAccessToken,
      refreshtoken: newRefreshToken,
    };
  }

  async updateRole(id: string, updateUserDto: UpdateUserDto): Promise<string> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.logger.debug(`Updating role for user ${id}`);
    Object.assign(user, updateUserDto);
    await this.usersRepository.save(user);
    return 'User role updated successfully';
  }

  async updateProfile(id: string, updateUserDto: UpdateUserDto): Promise<string> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      this.logger.warn(`User with id ${id} not found`);
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.role) {
      this.logger.warn(`Attempt to change role by user ${id}`);
      throw new ForbiddenException('You cannot update role');
    }

    if (updateUserDto.password) {
      const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS') || 10;
      updateUserDto.password = await encryptPassword(updateUserDto.password, saltRounds);
    }

    Object.assign(user, updateUserDto);
    await this.usersRepository.save(user);
    return 'Profile updated successfully';
  }

  async remove(id: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.usersRepository.softRemove(user);
  }

  // ─── Private Helpers ───

  private async generateAccessToken(user: User): Promise<string> {
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      branchId: user.branch?.id ?? '',
    };
    return this.jwtService.sign(payload);
  }

  private generateRefreshToken(): string {
    return uuidv4();
  }
}
