import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierDto {
    @ApiProperty({ description: 'Supplier company name', example: 'Tech Supplies Inc.' })
    @IsString()
    @IsNotEmpty()
    name: string;
    
    @ApiProperty({ description: 'Contact person name', example: 'Ahmed Hassan' })
    @IsString()
    @IsNotEmpty()
    contactPerson: string;
    
    @ApiProperty({ description: 'Supplier phone number', example: '+20 123 456 7890' })
    @IsString()
    @IsNotEmpty()
    phone: string;
    
    @ApiProperty({ description: 'Supplier email address', example: 'contact@techsupplies.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;
}
