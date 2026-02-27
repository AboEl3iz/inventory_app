import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVariantDto {
  @ApiProperty({ description: 'Product SKU', example: 'PROD-001-BLU' })
  @IsString()
  sku: string;

  @ApiProperty({
    description: 'Product barcode',
    example: '1234567890123',
    required: false,
  })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ description: 'Selling price', example: 99.99 })
  @IsNumber()
  price: number;

  @ApiProperty({ description: 'Cost price', example: 50.0 })
  @IsNumber()
  costPrice: number;

  @ApiProperty({ description: 'Initial stock quantity', example: 100 })
  @IsNumber()
  stockQuantity: number;

  @ApiProperty({
    description: 'Whether variant is active',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Product UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  productId?: string;
}
