import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class CreateBranchDto {
    @ApiProperty({ description: 'Branch name', example: 'Cairo Main Branch' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'Branch address', example: '123 Market Street, Cairo' })
    @IsString()
    @IsNotEmpty()
    address: string;

    @ApiProperty({ description: 'Branch phone number', example: '+20 123 456 7890' })
    @IsString()
    @IsNotEmpty()
    phone: string;

    @ApiProperty({ description: 'Whether branch is active', example: true, required: false })
    @IsOptional()
    isActive?: boolean;
}
