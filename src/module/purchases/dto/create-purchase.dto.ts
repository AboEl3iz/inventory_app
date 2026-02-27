import {
  IsUUID,
  IsInt,
  Min,
  IsNumber,
  IsArray,
  ArrayMinSize,
  IsOptional,
  IsIn,
  ValidateNested,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePurchaseItemDto {
  @ApiProperty({
    description: 'Product variant UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  variantId: string;

  @ApiProperty({ description: 'Quantity to purchase', example: 10, minimum: 1 })
  @IsInt()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;

  @ApiProperty({
    description: 'Unit cost per item',
    example: 99.99,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Unit cost cannot be negative' })
  unitCost: number;
}

// DTO لإنشاء فاتورة شراء
export class CreatePurchaseDto {
  @ApiProperty({
    description: 'Supplier UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  supplierId: string;

  @ApiProperty({
    description: 'Branch UUID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ description: 'Purchase items', type: [CreatePurchaseItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one item is required' })
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  items: CreatePurchaseItemDto[];

  @ApiProperty({
    description: 'Discount amount',
    example: 50.0,
    minimum: 0,
    required: false,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  discount?: number;

  @ApiProperty({
    description: 'Tax amount',
    example: 25.0,
    minimum: 0,
    required: false,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  tax?: number;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Urgent delivery needed',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
