import { IsInt, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferStockDto {
  @ApiProperty({
    description: 'Source branch UUID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  fromBranchId: string;

  @ApiProperty({
    description: 'Destination branch UUID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  toBranchId: string;

  @ApiProperty({
    description: 'Product variant UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  variantId: string;

  @ApiProperty({ description: 'Quantity to transfer', example: 10, minimum: 1 })
  @IsInt()
  @Min(1)
  qty: number;
}
