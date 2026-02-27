import { User } from 'src/module/users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAuthDto {
  @ApiProperty({ description: 'User object' })
  user: User;
  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;
  @ApiProperty({
    description: 'Token expiration date',
    example: '2025-11-14T10:00:00Z',
  })
  expiresAt: Date;
}
