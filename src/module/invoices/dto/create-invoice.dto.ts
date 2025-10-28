import { IsUUID, IsInt, Min, IsNumber, IsString, IsArray, ArrayMinSize, Validate } from "class-validator";

export class InvoiceItemDto {
  @IsUUID()
  variantId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  unitPrice: number;
}

export class CreateInvoiceDto {
  @IsUUID()
  branchId: string;

  @IsUUID()
  userId: string;

  @IsString()
  customerName: string;

  @IsArray()
  @ArrayMinSize(1)
  @Validate(() => InvoiceItemDto, { each: true })
  items: InvoiceItemDto[];
}