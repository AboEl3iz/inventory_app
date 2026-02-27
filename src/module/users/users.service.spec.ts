import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { User } from './entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Auth } from '../auth/entities/auth.entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { compare } from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';

const mockUser = {
  id: '1',
  name: 'Karim',
  email: 'karim@test.com',
  password: 'hashed_pass',
  role: 'cashier',
  branch: null,
  purchases: [],
  invoices: [],
};

const mockAuth = {
  id: 'a1',
  refreshToken: 'refresh123',
  expiresAt: new Date(),
  user: mockUser,
};

const mockUserRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  softRemove: jest.fn(),
};

const mockAuthRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

const mockAuthService = {
  create: jest.fn(),
  remove: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue(10),
};

const mockLogger = {
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};

// ⚙️ Helpers
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_pass'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('refresh-token-uuid'),
}));

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: mockLogger },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Auth), useValue: mockAuthRepo },
        { provide: AuthService, useValue: mockAuthService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  // 🧪 TEST: Create user
  describe('create()', () => {
    it('should create a new user successfully', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockUserRepo.create.mockReturnValue(mockUser);
      mockUserRepo.save.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('jwt-token');
      mockAuthService.create.mockResolvedValue(mockAuth);

      const result = await service.create({
        name: 'Karim',
        email: 'karim@test.com',
        password: '123456',
      });

      expect(result).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        accesstoken: 'jwt-token',
        refreshtoken: 'refresh-token-uuid',
      });

      expect(mockUserRepo.findOne).toHaveBeenCalledWith({ where: { email: 'karim@test.com' } });
      expect(mockUserRepo.create).toHaveReturnedWith(mockUser);
      expect(mockAuthService.create).toHaveBeenCalled();
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('should throw error if email exists', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      await expect(
        service.create({ name: 'Karim', email: 'karim@test.com', password: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // 🧪 TEST: Login user
  describe('login()', () => {
    it('should login successfully with valid credentials', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('jwt-token');
      mockAuthRepo.findOne.mockResolvedValue(null);
      mockAuthService.create.mockResolvedValue(mockAuth);
      const result = await service.login({ email: 'karim@test.com', password: '123456' });

      expect(result).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        branchId: '',
        purchases: [],
        invoices: [],
        accesstoken: 'jwt-token',
        refreshtoken: 'refresh-token-uuid',
      });

      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'karim@test.com' },
        relations: ['purchases', 'invoices', 'branch'],
      });
      expect(require('bcrypt').compare).toHaveBeenCalledWith('123456', 'hashed_pass');
      expect(mockJwtService.sign).toHaveBeenCalledTimes(1);
    });

    it('should throw error for invalid email', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(
        service.login({ email: 'karim@test.com', password: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for invalid password', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValueOnce(false);
      await expect(
        service.login({ email: 'karim@test.com', password: 'wrongpass' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should always rotate refresh token on login', async () => {
      const existingToken = {
        id: 'a1',
        refreshToken: 'old-token',
        expiresAt: new Date(Date.now() + 100000),
        user: mockUser,
      };

      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('jwt-token');
      mockAuthRepo.findOne.mockResolvedValue(existingToken);
      mockAuthService.create.mockResolvedValue(mockAuth);

      await service.login({ email: 'karim@test.com', password: '123456' });

      // Old token should always be removed regardless of expiry
      expect(mockAuthRepo.remove).toHaveBeenCalledWith(existingToken);
      // New token should always be created
      expect(mockAuthService.create).toHaveBeenCalled();
    });
  });

  // 🧪 TEST: Refresh token
  describe('refreshtoken()', () => {
    it('should refresh tokens successfully with valid refresh token', async () => {
      const oldref = { ...mockAuth, expiresAt: new Date(Date.now() + 1000) };
      mockAuthRepo.findOne.mockResolvedValue(oldref);
      mockJwtService.sign.mockReturnValue('new-jwt-token');
      mockAuthService.create.mockResolvedValue(mockAuth);
      const result = await service.refreshtoken('refresh123');

      expect(result).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        branchId: '',
        purchases: [],
        invoices: [],
        accesstoken: 'new-jwt-token',
        refreshtoken: 'refresh-token-uuid',
      });
      expect(mockAuthRepo.findOne).toHaveBeenCalledWith({
        where: { refreshToken: 'refresh123' },
        relations: ['user', 'user.branch', 'user.purchases', 'user.invoices'],
      });
      expect(mockAuthRepo.remove).toHaveBeenCalledWith(oldref);
      expect(mockAuthService.create).toHaveBeenCalled();
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('should throw error for invalid refresh token', async () => {
      mockAuthRepo.findOne.mockResolvedValue(null);
      await expect(service.refreshtoken('invalid-token')).rejects.toThrow(BadRequestException);
    });
    it('should throw error for expired refresh token', async () => {
      mockAuthRepo.findOne.mockResolvedValue({ ...mockAuth, expiresAt: new Date(Date.now() - 1000) });
      mockAuthRepo.remove.mockResolvedValue(undefined);
      await expect(service.refreshtoken('expired-token')).rejects.toThrow(BadRequestException);
      expect(mockAuthRepo.remove).toHaveBeenCalled();
    });
  });

  describe('updateRole()', () => {
    it('should update user role successfully', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockUserRepo.save.mockResolvedValue(mockUser);
      const result = await service.updateRole('1', { role: 'admin' });
      expect(result).toEqual('User role updated successfully');
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw error if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(service.updateRole('1', { role: 'admin' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile()', () => {
    it('should update user profile successfully', async () => {
      const userId = 'user_1';
      const updateUserDto = { name: 'New Name', password: 'newpass123' };
      mockUserRepo.findOne.mockResolvedValue({ ...mockUser, id: userId });
      mockUserRepo.save.mockResolvedValue({ ...mockUser, id: userId, name: 'New Name' });

      const result = await service.updateProfile(userId, updateUserDto);

      expect(mockUserRepo.findOne).toHaveBeenCalledTimes(1);
      expect(mockUserRepo.save).toHaveBeenCalled();
      expect(result).toBe('Profile updated successfully');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(service.updateProfile('user_1', { name: 'Name' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if trying to change role', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'user-1' } as any);
      await expect(service.updateProfile('user-1', { role: 'admin' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove()', () => {
    it('should soft delete user successfully', async () => {
      const userId = 'user_1';
      mockUserRepo.findOne.mockResolvedValue({ ...mockUser, id: userId });
      mockUserRepo.softRemove.mockResolvedValue(undefined);

      await service.remove(userId);
      expect(mockUserRepo.softRemove).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('user_1')).rejects.toThrow(NotFoundException);
    });
  });
});