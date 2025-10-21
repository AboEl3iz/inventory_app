import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class FilterProductDto {
    @IsOptional()
    @IsString()
   categoryId?: string;
   @IsOptional()
    @IsString()
   brand?: string;
   @IsOptional()
    @IsBoolean()
   isActive?: boolean;
   @IsOptional()
    @IsString()
   search?: string;
}