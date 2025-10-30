import { Type } from "class-transformer";
import { IsUUID, IsInt, Min, IsNumber, IsString, IsArray, ArrayMinSize, Validate, IsEnum, IsNotEmpty, IsOptional, ValidateNested } from "class-validator";
import { In } from "typeorm";

export class InvoiceItemDto {
  @IsUUID()
  @IsNotEmpty()
  variantId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;
}

export class CreateInvoiceDto {
  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Invoice must have at least one item' })
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  tax?: number;

  @IsEnum(['pending', 'paid', 'cancelled', 'refunded'])
  @IsOptional()
  status?: 'pending' | 'paid' | 'cancelled' | 'refunded';

  @IsEnum(['cash', 'card', 'bank_transfer', 'credit'])
  @IsOptional()
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'credit';

  @IsString()
  @IsOptional()
  notes?: string;
}