import { IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';

export class DashboardQueryDto {
  @IsOptional()
  @IsEnum(['today', 'week', 'month', 'year', 'custom'])
  period?: 'today' | 'week' | 'month' | 'year' | 'custom';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}
