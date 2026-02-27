/**
 * Shared test utilities for controller specs
 * Provides common mock providers needed by AuthenticationGuard
 */
import { JwtService } from '@nestjs/jwt';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

export const guardMockProviders = [
    { provide: JwtService, useValue: { verify: jest.fn(), sign: jest.fn() } },
    { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } },
];
