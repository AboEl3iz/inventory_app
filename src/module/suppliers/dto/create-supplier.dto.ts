import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class CreateSupplierDto {
    @IsString()
    @IsNotEmpty()
    name: string;
    
    @IsString()
    @IsNotEmpty()
    contactPerson: string;
    
    @IsString()
    @IsNotEmpty()
    phone: string;
    
    @IsEmail()
    @IsNotEmpty()
    email: string;
}
