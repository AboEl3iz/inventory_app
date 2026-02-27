import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class InventoryQueryDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsEnum(['all', 'low-stock', 'out-of-stock', 'overstocked'])
  status?: 'all' | 'low-stock' | 'out-of-stock' | 'overstocked';
}
