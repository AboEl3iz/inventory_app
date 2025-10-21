import { IsString, IsOptional, IsNumber, IsUUID, IsBoolean } from 'class-validator';

export class CreateVariantDto {
  @IsString()
  sku: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsNumber()
  price: number;

  @IsNumber()
  costPrice: number;

  @IsNumber()
  stockQuantity: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsUUID()
  @IsOptional()
  productId?: string;
}
