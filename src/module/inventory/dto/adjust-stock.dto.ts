import { IsUUID, IsInt } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class AdjustStockDto {
  @ApiProperty({ description: 'Branch UUID', example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsUUID()
  branchId: string;

  @ApiProperty({ description: 'Product variant UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  variantId: string;

  @ApiProperty({ description: 'Quantity change (positive to increase, negative to decrease)', example: 5 })
  @IsInt()
  qtyChange: number; // +ve or -ve
}