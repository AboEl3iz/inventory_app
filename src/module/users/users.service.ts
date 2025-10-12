import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';
import { v4 as uuidv4 } from 'uuid';
import { encryptPassword } from 'src/shared/encryption';
import { IregisterResponse } from 'src/shared/interfaces/register-response';
import { IloginResponse } from 'src/shared/interfaces/login.response';
import { Auth } from '../auth/entities/auth.entity';
@Injectable()
export class UsersService {
  constructor(@InjectRepository(User)
  private usersRepository: Repository<User>,
    @InjectRepository(Auth)
    private authRepository: Repository<Auth>,
    private configService: ConfigService,
    private readonly jwtService: JwtService,
    private authService: AuthService
  ) { }
  async create(createUserDto: CreateUserDto): Promise<IregisterResponse> {
    if (await this.usersRepository.findOne({ where: { email: createUserDto.email } })) {
      throw new BadRequestException('Email already exists');
    }
    const hashedPassword = await encryptPassword(createUserDto.password, 10);
    const user = await this.usersRepository.create({
      ...createUserDto, password: hashedPassword
    });
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

  async login(userId: string): Promise<IloginResponse> {
    let user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['purchases', 'invoices', 'branch']
    });
    const accesstoken = await this.generateToken(user!);
    const refreshtoken = this.generateRefreshToken();
    Logger.warn('User found:', user);
    let oldRefreshToken = await this.authRepository.findOne({ where: { user: { id: userId } } });
    Logger.warn('oldRefreshToken:', oldRefreshToken);

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
    return this.login(oldToken.user.id);
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }


  private async generateToken(user: User) {
    const payload = { id: user.id, email: user.email, role: user.role };
    const token = await this.jwtService.sign(payload);
    return token;
  }
  private generateRefreshToken() {
    return uuidv4();
  }
}
