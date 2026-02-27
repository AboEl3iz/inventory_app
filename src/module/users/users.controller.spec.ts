import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';
import { Auth } from '../auth/entities/auth.entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import e from 'express';
const mockAuthGuard = jest.fn().mockImplementation(() => true);
const mockAuthorizationGuard = jest.fn().mockImplementation(() => true);
const mockUserRepo = {};
const mockAuthRepo = {};
const mockAuthService = { create: jest.fn() };
const mockJwtService = { sign: jest.fn().mockReturnValue('mocked-token') };
const mockConfigService = { get: jest.fn() };
const mockLogger = {
  debug: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
};
describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;
  const mockUsersService = {
    create: jest.fn(),
    login: jest.fn(),
    refreshtoken: jest.fn(),
    updateRole: jest.fn().mockResolvedValue('User updated successfully'),
    updateProfile: jest.fn().mockResolvedValue('User updated successfully'),
    remove: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Auth), useValue: mockAuthRepo },
        { provide: AuthService, useValue: mockAuthService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: mockLogger },
      ],
    })
      .overrideGuard(mockAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(mockAuthorizationGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a user', async () => {
      const dto = {
        name: 'Test User',
        email: 'test@gmail.com',
        password: 'password',
      };
      jest.spyOn(service, 'create').mockResolvedValue({
        id: '1',
        name: dto.name,
        email: dto.email,
        role: 'cashier',
        accesstoken: 'mocked-token',
        refreshtoken: 'mocked-refresh-token',
      } as any);
      const result = await controller.register(dto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('accesstoken', 'mocked-token');
      expect(result).toHaveProperty('refreshtoken', 'mocked-refresh-token');
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      const dto = { email: 'hello@gmail.com', password: 'password' };
      jest.spyOn(service, 'login').mockResolvedValue({
        id: '1',
        name: 'Test User',
        email: dto.email,
        role: 'cashier',
        accesstoken: 'mocked-token',
        refreshtoken: 'mocked-refresh-token',
      } as any);
      const result = await controller.login(dto);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('accesstoken', 'mocked-token');
      expect(result).toHaveProperty('refreshtoken', 'mocked-refresh-token');
    });
  });

  describe('refreshtoken', () => {
    it('should refresh token', async () => {
      const refreshtoken = 'mocked-refresh-token';
      jest.spyOn(service, 'refreshtoken').mockResolvedValue({
        id: '1',
        name: 'Test User',
        email: 'hello@gmail.com',
        role: 'cashier',
        accesstoken: 'new-mocked-token',
        refreshtoken: 'new-mocked-refresh-token',
      } as any);
      const result = await controller.refreshToken(refreshtoken);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('accesstoken', 'new-mocked-token');
      expect(result).toHaveProperty('refreshtoken', 'new-mocked-refresh-token');
    });
  });

  describe('update', () => {
    it('should update user role', async () => {
      const id = '1';
      const dto: {
        role: 'admin' | 'manager' | 'cashier';
      } = { role: 'manager' };
      jest
        .spyOn(service, 'updateRole')
        .mockResolvedValue('User updated successfully' as any);
      const result = await controller.update(id, dto);
      expect(result).toBe('User updated successfully');
      expect(service.updateRole).toHaveBeenCalledWith(id, dto);
      expect(service.updateRole).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateinfo', () => {
    it('should update user profile', async () => {
      const req = { user: { id: '1' } };
      const dto = { name: 'Updated User' };
      jest
        .spyOn(service, 'updateProfile')
        .mockResolvedValue('User updated successfully' as any);
      const result = await controller.updateinfo(req, dto);
      expect(result).toBe('User updated successfully');
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      const id = '1';
      jest.spyOn(service, 'remove').mockResolvedValue();
      const result = await controller.remove(id);
      expect(result).toBe(undefined);
      expect(service.remove).toHaveBeenCalledWith(id);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });
  });
});
