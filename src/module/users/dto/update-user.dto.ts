import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    description: 'User full name',
    example: 'Jane Doe',
    required: false,
  })
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'User email address',
    example: 'jane@example.com',
    required: false,
  })
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'User password',
    example: 'NewPassword123!',
    required: false,
  })
  @IsOptional()
  password?: string;

  @ApiProperty({
    description: 'User role',
    enum: ['admin', 'manager', 'cashier'],
    required: false,
  })
  @IsOptional()
  role?: 'admin' | 'manager' | 'cashier';
}
