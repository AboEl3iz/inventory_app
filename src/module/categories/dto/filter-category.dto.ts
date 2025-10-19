import { IsOptional, IsString } from 'class-validator';

export class FilterCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;
}
