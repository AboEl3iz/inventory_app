import { IsUUID, IsInt, Min, IsOptional } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class CreateInventoryDto {
  @ApiProperty({ description: 'Branch UUID', example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsUUID()
  branchId: string;

  @ApiProperty({ description: 'Product variant UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  variantId: string;

  @ApiProperty({ description: 'Current quantity in stock', example: 100, minimum: 0 })
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiProperty({ description: 'Minimum threshold quantity', example: 20, required: false })
  @IsInt()
  @IsOptional()
  minThreshold?: number;
}