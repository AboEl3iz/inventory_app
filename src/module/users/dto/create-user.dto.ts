import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty({ description: 'User full name', example: 'John Doe' })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({ description: 'User email address', example: 'john@example.com' })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({ description: 'User password', example: 'SecurePassword123!' })
    @IsNotEmpty()
    @IsString()
    password: string;
}
