import { Type } from 'class-transformer';
import {
  IsUUID,
  IsInt,
  Min,
  IsNumber,
  IsString,
  IsArray,
  ArrayMinSize,
  Validate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { In } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export class InvoiceItemDto {
  @ApiProperty({
    description: 'Product variant UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  variantId: string;

  @ApiProperty({ description: 'Item quantity', example: 2, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Unit price', example: 99.99, minimum: 0 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({
    description: 'Item discount',
    example: 10.0,
    minimum: 0,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;
}

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Branch UUID',
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
  })
  @IsOptional()
  branchId: string;

  @ApiProperty({
    description: 'Customer email',
    example: 'customer@example.com',
    required: false,
  })
  @IsOptional()
  CustomerEmail: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  CustomerName: string;

  @ApiProperty({
    description: 'User UUID',
    example: '550e8400-e29b-41d4-a716-446655440002',
    required: false,
  })
  @IsOptional()
  userId: string;

  @ApiProperty({ description: 'Invoice items', type: [InvoiceItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Invoice must have at least one item' })
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @ApiProperty({
    description: 'Invoice discount',
    example: 50.0,
    minimum: 0,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @ApiProperty({
    description: 'Invoice tax',
    example: 25.0,
    minimum: 0,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  tax?: number;

  @ApiProperty({
    description: 'Invoice status',
    enum: ['pending', 'paid', 'cancelled', 'refunded'],
    required: false,
  })
  @IsEnum(['pending', 'paid', 'cancelled', 'refunded'])
  @IsOptional()
  status?: 'pending' | 'paid' | 'cancelled' | 'refunded';

  @ApiProperty({
    description: 'Payment method',
    enum: ['cash', 'card', 'bank_transfer', 'credit'],
    required: false,
  })
  @IsEnum(['cash', 'card', 'bank_transfer', 'credit'])
  @IsOptional()
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'credit';

  @IsString()
  @IsOptional()
  notes?: string;
}
