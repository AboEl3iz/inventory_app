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

export class CreatePurchaseItemDto {
  @IsUUID()
  @IsNotEmpty()
  variantId: string;

  @IsInt()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Unit cost cannot be negative' })
  unitCost: number;
}

// DTO لإنشاء فاتورة شراء
export class CreatePurchaseDto {
  @IsUUID()
  @IsNotEmpty()
  supplierId: string;

  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one item is required' })
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  items: CreatePurchaseItemDto[];

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  discount?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  tax?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}