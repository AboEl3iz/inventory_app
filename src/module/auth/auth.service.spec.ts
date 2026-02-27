import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Auth } from './entities/auth.entity';

const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@test.com',
  role: 'admin',
};

const mockAuth = {
  id: 'auth-1',
  user: mockUser,
  refreshToken: 'refresh-123',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
};

const mockAuthRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  remove: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Auth), useValue: mockAuthRepo },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create()', () => {
    it('should create an auth record', async () => {
      const dto = {
        user: mockUser as any,
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
      mockAuthRepo.create.mockReturnValue(mockAuth);
      mockAuthRepo.save.mockResolvedValue(mockAuth);

      const result = await service.create(dto);

      expect(result).toEqual(mockAuth);
      expect(mockAuthRepo.create).toHaveBeenCalledWith(dto);
      expect(mockAuthRepo.save).toHaveBeenCalledWith(mockAuth);
    });
  });

  describe('findAll()', () => {
    it('should return all auth records message', () => {
      const result = service.findAll();
      expect(result).toBe('This action returns all auth');
    });
  });

  describe('findOne()', () => {
    it('should return specific auth record message', () => {
      const result = service.findOne(1);
      expect(result).toBe('This action returns a #1 auth');
    });
  });

  describe('update()', () => {
    it('should return update message', () => {
      const result = service.update(1, {} as any);
      expect(result).toBe('This action updates a #1 auth');
    });
  });

  describe('remove()', () => {
    it('should return remove message', () => {
      const result = service.remove(1);
      expect(result).toBe('This action removes a #1 auth');
    });
  });
});
