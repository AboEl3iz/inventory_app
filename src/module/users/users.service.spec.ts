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
import { BadRequestException, ForbiddenException } from '@nestjs/common';
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
        ConfigService,
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
      const result = await service.login({ email: 'karim@test .com', password: '123456' });

      expect(result).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        branchId: '',
        purchases: [],
        invoivses: [],
        accesstoken: 'jwt-token',
        refreshtoken: 'refresh-token-uuid',
      });

      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'karim@test .com' },
        relations: ['purchases', 'invoices', 'branch'],
      });
      expect(require('bcrypt').compare).toHaveBeenCalledWith('123456', 'hashed_pass');
      expect(mockJwtService.sign).toHaveBeenCalledTimes(1);
    });

    it('should throw error for invalid email', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(
        service.login({ email: 'karim@test .com', password: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for invalid password', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(false);
      await expect(
        service.login({ email: 'karim@test .com', password: 'wrongpass' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle existing but expired refresh token', async () => {
      const user = { id: 1, email: 'admin@test.com', role: 'admin' } as any;

      const mockTokens = {
        accesstoken: 'access-token',
        refreshtoken: 'refresh-token',
        oldRefreshToken: {
          id: 5,
          expiresAt: new Date(Date.now() - 1000), // expired
        },
      };

      jest.spyOn(service, 'generateTokens').mockResolvedValue(mockTokens as any);

      const { oldRefreshToken } = await service.generateTokens(user);

      if (oldRefreshToken && oldRefreshToken.expiresAt < new Date()) {
        await mockAuthRepo.remove(oldRefreshToken);
        await mockAuthService.create({ user: user, refreshToken: mockTokens.refreshtoken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
      }

      expect(mockAuthRepo.remove).toHaveBeenCalledWith(oldRefreshToken);
      expect(mockAuthService.create).toHaveBeenCalledWith({ user: user, refreshToken: mockTokens.refreshtoken, expiresAt: expect.any(Date) });
      expect(mockAuthService.create).toHaveBeenCalledTimes(1);


    });

    it('should handle existing and valid refresh token', async () => {
      const user = { id: 1, email: 'admin@test.com', role: 'admin' } as any;

      const mockTokens = {
        accesstoken: 'access-token',
        refreshtoken: 'refresh-token',
        oldRefreshToken: {
          id: 5,
          expiresAt: new Date(Date.now() + 1000), // expired
        },
      };
      jest.spyOn(service, 'generateTokens').mockResolvedValue(mockTokens as any);

      const { oldRefreshToken } = await service.generateTokens(user);
      if (oldRefreshToken && oldRefreshToken.expiresAt < new Date()) {
        await mockAuthRepo.remove(oldRefreshToken);
        await mockAuthService.create({ user: user, refreshToken: mockTokens.refreshtoken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
      }
      expect(mockAuthRepo.remove).not.toHaveBeenCalled();
      expect(mockAuthService.create).not.toHaveBeenCalled();

    });
  });

  // 🧪 TEST: Refresh token
  describe('refreshtoken()', () => {
    it('should refresh tokens successfully with valid refresh token', async () => {
      const oldref = { ...mockAuth, expiresAt: new Date(Date.now() + 1000) }
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
        invoivses: [],
        accesstoken: 'new-jwt-token',
        refreshtoken: 'refresh-token-uuid',
      });
      expect(mockAuthRepo.findOne).toHaveBeenCalledWith({ where: { refreshToken: 'refresh123' }, relations: ['user'] });
      expect(mockAuthRepo.remove).toHaveBeenCalledWith(
        oldref
      );
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


  describe('update role()', () => {
    it('should update user role successfully', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockUserRepo.update.mockResolvedValue('User updated successfully' as string);
      const result = await service.updateRole('1', { role: 'admin' });
      expect(result).toEqual('User updated successfully');
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(mockUserRepo.update).toHaveBeenCalledTimes(1);
    }
    ),
      it('should throw error if user not found', async () => {
        mockUserRepo.findOne.mockResolvedValue(null);
        await expect(service.updateRole('1', { role: 'admin' })).rejects.toThrow(BadRequestException);
      });
  });

  describe('update profile()', () => {
    it('should update user profile successfully', async () => {
      const userId = 'user_1';
      const updateUserDto = { name: 'New Name', password: 'newpass123' };
      mockUserRepo.findOne.mockResolvedValue({ ...mockAuth, password: updateUserDto.password })
      const encryptedPassword = 'hashed-newpass';


      const result = await service.updateProfile(userId, updateUserDto)


      expect((mockUserRepo.findOne)).toHaveBeenCalledTimes(1)
      expect(mockUserRepo.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining(
          {
            password: 'hashed_pass',
            name: updateUserDto.name
          }
        )
      )
      expect(result).toBe('User updated successfully')

    }),
      it('should throw BadRequestException if user not found', async () => {
        mockUserRepo.findOne.mockResolvedValue(null);
        await expect(service.updateProfile('user_1', { name: 'Name' })).rejects.toThrow(BadRequestException);
      });
    it('should throw ForbiddenException if trying to change role', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'user-1' } as any);
      await expect(service.updateProfile('user-1', { role: 'admin' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove()', () => {
    it('should delete user successfuly', async () => {
      const userId = 'user_1';

      mockUserRepo.delete.mockResolvedValue(
        undefined
      )

      const result = await service.remove(userId);
      expect(mockUserRepo.delete).toHaveBeenCalledTimes(1)
      expect(mockUserRepo.delete).toHaveBeenCalledWith(userId)
      expect(result).toBeUndefined

    }

    )
  })

});